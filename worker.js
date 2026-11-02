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
const SKY_AD_SYSTEM_PROMPT = `You are Buckshot, AI mascot for Mike's Sporting Goods (GTA FiveM RP store). Three jobs only:
1. Write in-game sky ads  2. Report employee hours  3. Report employee taxes
Anything else: "I'm only set up to help with sky ads, hours, and taxes. Try one of the chips below! 🎣"

SKY ADS — write for ANY product the employee asks about. Rules:
• Max 135 chars. Prefix each ad line with "AD: " (system converts to in-game command).
• Colors: ^1=red ^2=green ^3=yellow ^4=blue ^5=cyan ^6=purple ^7=white ^8=orange ^9=reset. ^*=bold ^_=underline.
• Color PERSISTS until changed: ^3Gold Nuggets^9 colors BOTH words yellow — never break a phrase unless you want a color change.
• ALWAYS apply these color rules: prices & dollar amounts→^2 | "Mike's" brand name→^8 | gold/precious items→^3 | fish/nature→^5 | fire/flares→^1 | hunting gear→^3 or ^8 | ammo→^1.
• NO markdown — no **bold**, no *italics*, no bullet symbols. Plain text only.
• NO invented discounts or sale % unless the employee explicitly mentions a real promotion.
• CTA rules: Mike's BUYS from players → "Bring it in!" / "Sell to us!" / "We're buying!" | Mike's SELLS to players → "Grab yours!" / "In stock now!" / "Stop in today!"
• Example (gold buy ad): AD: ^8💰 Mike's^9 buys ^3Gold Nuggets^9 — ^2$32^9 each! ^8Bring it in!^9

HOURS — answer from context below. If missing: say you can't load it right now.
TAXES — answer from context below. $0 + Manager rank = tax-exempt. $0 other rank = all clear. If missing: check Taxes page.

PRICES (Mike's buys from players): Fish $87–250 · Meat $75–475 · Hides $125–525 · Bones $225 · Gold Nugget $32
Sells to players: White Fish Meat $17 · Salmon Meat $20 · Crab $90
Use "CURRENT POS ITEM PRICES" from context for live gear/membership prices.`;

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

    // If empty, retry once with explicit FiveM game context to clear content filters
    if (!reply.trim()) {
      const lastUserIdx = [...groqMessages].map(m => m.role).lastIndexOf('user');
      if (lastUserIdx !== -1) {
        const retryMessages = groqMessages.map((m, i) =>
          i === lastUserIdx
            ? { ...m, content: `(FiveM GTA roleplay game store request) ${m.content}` }
            : m
        );
        try {
          const retryRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${env.GROQ_API_KEY}`,
            },
            body: JSON.stringify({ ...groqPayload, messages: retryMessages }),
          });
          if (retryRes.ok) {
            const retryData = await retryRes.json();
            reply = retryData?.choices?.[0]?.message?.content ?? '';
          }
        } catch (_) { /* fall through to fallback below */ }
      }
    }

    // Strip markdown formatting — the widget renders plain text, not markdown
    reply = reply
      .replace(/\*\*(.+?)\*\*/g, '$1')  // **bold** → bold
      .replace(/\*(.+?)\*/g, '$1')       // *italic* → italic
      .replace(/`(.+?)`/g, '$1')         // `code` → code
      .replace(/^#{1,6}\s+/gm, '');      // ## headings → plain

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
      reply = "Hmm, I couldn't generate that. Try rephrasing — for example: \"make a sky ad advertising that we buy gold nuggets from players\".";
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
