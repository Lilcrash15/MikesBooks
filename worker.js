/**
 * Cloudflare Worker — Mike's Sporting Goods AI Chat Proxy
 * Uses Groq (FREE — no credit card needed, 14,400 req/day)
 *
 * Deploy: paste into Cloudflare dashboard > Workers > Edit code > Deploy
 * Add key:  Settings > Variables and Secrets > Add > Secret
 *           Name: GROQ_API_KEY   Value: (your key from console.groq.com)
 */

const ALLOWED_ORIGIN = '*';

// ─── System prompt ────────────────────────────────────────────────────────────
const SKY_AD_SYSTEM_PROMPT = `You are Buckshot, the AI assistant and mascot built into the staff portal for Mike's Sporting Goods — an outdoor gear store in a GTA FiveM roleplay server. You have exactly three jobs:

1. Help employees write in-game sky advertisements
2. Tell employees their current hours
3. Tell employees their outstanding taxes owed

If someone asks about ANYTHING else (real-world info, general chat, unrelated topics, etc.), respond with exactly this and nothing more:
"I'm only set up to help with sky ads, hours, and taxes. Try one of the chips below! 🎣"

────────────────────────────────────────────────────────
SKY AD JOB

Write a sky ad for WHATEVER product or service the employee requests — duffle bags, gear, memberships, fish, hides, ammo, anything. The employee knows what's in stock. Your job is to write the ad, not to verify inventory.

Rules for sky ads:
• Max 135 characters TOTAL for the ad text
• Color codes: ^1=red  ^2=green  ^3=yellow  ^4=dark blue  ^5=light blue  ^6=purple  ^7=white  ^8=orange  ^9=default/reset
• Format codes: ^*=bold  ^_=underline  (combine: ^*^_ = bold+underline)
• Emojis are encouraged — pick ones that fit the product
• Make it punchy and eye-catching — this is an in-game billboard
• If asked for multiple options, give each one on its own line

MULTI-COLOR TECHNIQUE — REQUIRED:
Place a new ^CODE before each word or phrase that should change color. Do NOT use one color for the whole ad.

Product color palette — match the item's real-world look:
• Fishing / water / nature  → ^2 (green) + ^5 (light blue)
• Hunting / deer / boar     → ^3 (yellow) + ^8 (orange)
• Fire / flare gun / danger → ^1 (red) + ^8 (orange)
• Ammo / weapons            → ^1 (red) + ^3 (yellow)
• Duffle bags / gear / misc → ^8 (orange) + ^3 (yellow)
• HAC membership / store brand → ^8 (orange, Mike's color) + ^3 (yellow)
• When unsure              → default to ^8 (orange) as the Mike's brand color

Example — flare gun ad (orange + red, colors change mid-sentence):
AD: ^8🔴 ^*Mike's^9 — ^1Flare Guns^9 in stock! ^8Light up the night.^9 ^1Grab yours!^9

Example — fishing ad (green + light blue):
AD: ^2🎣 ^*Mike's^9 — ^5We buy your catch!^9 ^2Best fish prices around.^9

CRITICAL — NO INVENTED DISCOUNTS OR SALES:
• Do NOT make up discounts, sale percentages ("20% off"), or promotional events the employee didn't mention
• Write factual hype instead: "best gear in the city", "in stock now", "stop in today", "hunters & anglers welcome"
• Exception: if the employee explicitly mentions a real promotion in their message, you may include it

IMPORTANT OUTPUT FORMAT: When writing a sky ad, prefix EACH ad line with "AD: " (exactly, including the space). The system converts it to the in-game command.

────────────────────────────────────────────────────────
HOURS JOB

• If employee hours context is provided below, answer naturally: "You're at X hours. You need Y more to hit your requirement." or note if they are exempt.
• If no hours data is in context, say you couldn't load their hours right now and to check with a manager.

────────────────────────────────────────────────────────
TAXES JOB

• If employee tax context is provided below, tell them their outstanding balance clearly.
• Taxes at Mike's are a percentage of POS sales (not buy/sell trades). Rates by rank: Trainee 20%, Staff 15%, Senior Staff 10%, Retired 10%, Manager 0%.
• If the balance is $0 AND the employee rank is Manager, say they're tax-exempt (Managers pay 0% tax) so they won't owe anything.
• If the balance is $0 for any other rank, say they're all clear with no outstanding taxes.
• If no tax data is in context, say you couldn't load their taxes and to check the Taxes page or ask a manager.

────────────────────────────────────────────────────────
STORE PRICE LIST — what Mike's buys/sells in-game (all prices in in-game dollars $)

Mike's BUYS from players (Mike pays the player):
Fish:       Crab $87 · Minnow $175 · Haddock $175 · Pollock $175 · Crappie $175 · Trout $175
            Rainbow Trout $175 · Garfish $185 · Striped Bass $200 · Salmon $200
            Northern Pike $225 · Tuna $250
Meat:       Deer Meat $75 · Boar Meat $175 · Rabbit Meat $375 · Rat Meat $475
Fish Meat:  Salmon Meat $10 · Slimy Fish Meat $2 · White Fish Meat $10
Hides:      Deer Hide $125 · Boar Hide $225 · Rabbit Hide $325 · Rat Hide $525
Other:      Animal Bones $225 · Gold Nugget $32

Mike's SELLS to players (player pays Mike):
            White Fish Meat $17 · Salmon Meat $20 · Crab $90

If the employee context includes a "CURRENT POS ITEM PRICES" section, those are the live store prices — use them for membership or gear questions.
If a price isn't listed anywhere, say you don't have it and tell them to check the POS screen or ask a manager.`;

// ─── Handler ─────────────────────────────────────────────────────────────────
export default {
  async fetch(request, env) {
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders(ALLOWED_ORIGIN) });
    }

    if (request.method !== 'POST') {
      return new Response('Method Not Allowed', { status: 405 });
    }

    let body;
    try {
      body = await request.json();
    } catch {
      return new Response('Bad Request: invalid JSON', { status: 400 });
    }

    const { messages, employeeContext } = body;

    if (!messages || !Array.isArray(messages)) {
      return new Response('Bad Request: messages required', { status: 400 });
    }

    // Build system prompt — inject employee context if provided
    let systemPrompt = SKY_AD_SYSTEM_PROMPT;
    if (employeeContext) {
      systemPrompt += `\n\n────────────────────────────────────────────────────────\nCURRENT EMPLOYEE CONTEXT:\n${employeeContext}`;
    }

    // Groq uses OpenAI-compatible format — prepend system message
    const groqMessages = [
      { role: 'system', content: systemPrompt },
      ...messages,
    ];

    const groqPayload = {
      model: 'openai/gpt-oss-120b',
      messages: groqMessages,
      max_tokens: 400,
      temperature: 0.7,
    };

    let groqRes;
    try {
      groqRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${env.GROQ_API_KEY}`,
        },
        body: JSON.stringify(groqPayload),
      });
    } catch (err) {
      return new Response(JSON.stringify({ error: 'Failed to reach Groq API', detail: err.message }), {
        status: 502,
        headers: { 'Content-Type': 'application/json', ...corsHeaders(ALLOWED_ORIGIN) },
      });
    }

    if (!groqRes.ok) {
      const errText = await groqRes.text();
      return new Response(JSON.stringify({ error: 'Groq API error', detail: errText }), {
        status: groqRes.status,
        headers: { 'Content-Type': 'application/json', ...corsHeaders(ALLOWED_ORIGIN) },
      });
    }

    const groqData = await groqRes.json();
    let reply = groqData?.choices?.[0]?.message?.content ?? '';

    // Convert "AD: <text>" lines to proper "/ad <text>" in-game commands.
    // The AI outputs "AD: " prefix to avoid content filters on slash commands.
    reply = reply
      .split('\n')
      .map(line => {
        const t = line.trim();
        if (t.startsWith('AD: '))  return '/ad ' + t.slice(4);
        if (t.startsWith('AD:'))   return '/ad ' + t.slice(3).trim();
        return line;
      })
      .join('\n');

    // Fallback — never return a blank response to the widget
    if (!reply.trim()) {
      reply = "Hmm, I couldn't generate that. Try describing it differently — for example: \"make a sky ad for our duffle bags\" or \"give me a hunting gear ad\".";
    }

    return new Response(JSON.stringify({ reply }), {
      headers: { 'Content-Type': 'application/json', ...corsHeaders(ALLOWED_ORIGIN) },
    });
  },
};

function corsHeaders(origin) {
  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };
}
