/**
 * ai-chat-widget.js — Mike's Sporting Goods AI Chat Widget
 *
 * Drop this into any page:   <script defer src="ai-chat-widget.js"></script>
 * Already included in:       index.html, manager.html, ads.html
 *
 * ⚠️  Replace WORKER_URL below with your Cloudflare Worker URL after deploying worker.js.
 *     Everything else is automatic — it reads Firebase + MikesTimeClock from the host page.
 */
(function () {
    'use strict';

    const WORKER_URL = 'https://rough-glitter-fc6f.lilcrash19.workers.dev';

    // ── Cooldown config ───────────────────────────────────────────────────────
    const SEND_COOLDOWN_MS  = 10000; // 10s between any messages
    const DATA_COOLDOWN_MS  = 60000; // 60s between tax/hours re-fetches

    // ── State ─────────────────────────────────────────────────────────────────
    let history          = []; // { role, content }[]
    let empDoc           = null;
    let hoursCtx         = null;
    let taxCtx           = null;
    let hoursLoaded      = false;
    let isOpen           = false;
    let isBusy           = false;
    let lastSentAt       = 0;
    let lastTaxFetchAt   = 0;
    let lastHoursFetchAt = 0;
    const loggedInName = localStorage.getItem('loggedInEmployeeName') || null;

    // ── Inject styles ─────────────────────────────────────────────────────────
    const CSS = `
    #ai-widget-btn {
        position: fixed;
        bottom: 22px;
        right: 22px;
        z-index: 9000;
        width: 52px;
        height: 52px;
        border-radius: 50%;
        background: #c05621;
        border: none;
        cursor: pointer;
        box-shadow: 0 4px 18px rgba(0,0,0,0.45);
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 1.5rem;
        transition: transform 0.15s, box-shadow 0.15s;
        user-select: none;
    }
    #ai-widget-btn:hover { transform: scale(1.08); box-shadow: 0 6px 24px rgba(0,0,0,0.55); }
    #ai-widget-btn .ai-notif {
        position: absolute;
        top: 2px; right: 2px;
        width: 10px; height: 10px;
        background: #68d391;
        border-radius: 50%;
        border: 2px solid #1a202c;
        display: none;
    }

    #ai-widget-panel {
        position: fixed;
        bottom: 86px;
        right: 22px;
        z-index: 9001;
        width: 340px;
        max-width: calc(100vw - 32px);
        background: #1e2432;
        border: 1px solid rgba(255,255,255,0.1);
        border-radius: 16px;
        box-shadow: 0 8px 40px rgba(0,0,0,0.6);
        display: flex;
        flex-direction: column;
        overflow: hidden;
        transition: opacity 0.18s, transform 0.18s;
        opacity: 0;
        transform: translateY(12px) scale(0.97);
        pointer-events: none;
    }
    #ai-widget-panel.open {
        opacity: 1;
        transform: translateY(0) scale(1);
        pointer-events: all;
    }

    .ai-panel-header {
        background: rgba(0,0,0,0.25);
        padding: 11px 14px;
        display: flex;
        align-items: center;
        gap: 9px;
        border-bottom: 1px solid rgba(255,255,255,0.08);
        flex-shrink: 0;
    }
    .ai-panel-header .ai-avatar {
        font-size: 1.25rem;
        line-height: 1;
    }
    .ai-panel-header .ai-title {
        flex: 1;
        color: #f7fafc;
        font-weight: 600;
        font-size: 0.95rem;
        line-height: 1.2;
    }
    .ai-panel-header .ai-subtitle {
        color: #718096;
        font-size: 0.72rem;
        font-weight: 400;
    }
    .ai-panel-header button {
        background: none;
        border: none;
        color: #718096;
        cursor: pointer;
        font-size: 1.1rem;
        padding: 2px 4px;
        line-height: 1;
        border-radius: 4px;
        transition: color 0.12s;
    }
    .ai-panel-header button:hover { color: #f7fafc; }

    #ai-messages {
        flex: 1;
        overflow-y: auto;
        padding: 12px;
        display: flex;
        flex-direction: column;
        gap: 10px;
        min-height: 220px;
        max-height: 320px;
    }

    .ai-msg { display: flex; flex-direction: column; gap: 3px; }
    .ai-msg.user { align-items: flex-end; }
    .ai-msg.bot  { align-items: flex-start; }

    .ai-bubble {
        max-width: 86%;
        padding: 8px 12px;
        border-radius: 14px;
        font-size: 0.875rem;
        line-height: 1.5;
        white-space: pre-wrap;
        word-break: break-word;
        font-family: inherit;
    }
    .ai-msg.user .ai-bubble {
        background: #c05621;
        color: #fff;
        border-bottom-right-radius: 4px;
    }
    .ai-msg.bot .ai-bubble {
        background: rgba(255,255,255,0.07);
        color: #e2e8f0;
        border-bottom-left-radius: 4px;
    }

    .ai-ad-code {
        display: block;
        margin-top: 6px;
        background: rgba(0,0,0,0.4);
        border: 1px solid rgba(255,255,255,0.1);
        border-radius: 7px;
        padding: 6px 10px;
        font-family: monospace;
        font-size: 0.82rem;
        color: #68d391;
        word-break: break-all;
    }
    .ai-copy-btn {
        align-self: flex-start;
        margin-top: 2px;
        background: none;
        border: 1px solid rgba(255,255,255,0.15);
        border-radius: 5px;
        color: #718096;
        font-size: 0.74rem;
        padding: 2px 9px;
        cursor: pointer;
        font-family: inherit;
        transition: background 0.12s, color 0.12s;
    }
    .ai-copy-btn:hover { background: rgba(255,255,255,0.08); color: #e2e8f0; }

    .ai-typing { color: #718096; font-size: 0.8rem; font-style: italic; padding: 2px 0; }

    .ai-chips {
        display: flex;
        flex-wrap: wrap;
        gap: 6px;
        padding: 8px 12px 4px;
        flex-shrink: 0;
    }
    .ai-chip {
        background: rgba(255,255,255,0.05);
        border: 1px solid rgba(255,255,255,0.1);
        border-radius: 14px;
        padding: 4px 10px;
        font-size: 0.76rem;
        color: #a0aec0;
        cursor: pointer;
        font-family: inherit;
        transition: background 0.12s, color 0.12s;
        white-space: nowrap;
    }
    .ai-chip:hover { background: rgba(255,255,255,0.1); color: #e2e8f0; }

    .ai-input-row {
        display: flex;
        gap: 8px;
        padding: 10px 12px;
        border-top: 1px solid rgba(255,255,255,0.08);
        flex-shrink: 0;
    }
    #ai-input {
        flex: 1;
        background: rgba(255,255,255,0.06);
        border: 1px solid rgba(255,255,255,0.1);
        border-radius: 8px;
        color: #f7fafc;
        padding: 7px 10px;
        font-size: 0.875rem;
        resize: none;
        outline: none;
        font-family: inherit;
        line-height: 1.35;
    }
    #ai-input:focus { border-color: #c05621; }
    #ai-input::placeholder { color: #4a5568; }
    #ai-send-btn {
        background: #c05621;
        color: #fff;
        border: none;
        border-radius: 8px;
        padding: 0 14px;
        font-size: 1rem;
        cursor: pointer;
        flex-shrink: 0;
        transition: opacity 0.12s;
    }
    #ai-send-btn:hover { opacity: 0.85; }
    #ai-send-btn:disabled { opacity: 0.35; cursor: default; }
    #ai-send-btn.cooldown {
        background: #2d3748;
        font-size: 0.72rem;
        letter-spacing: 0.02em;
    }

    .ai-disclaimer {
        text-align: center;
        font-size: 0.67rem;
        color: #4a5568;
        padding: 2px 14px 7px;
        flex-shrink: 0;
        line-height: 1.35;
    }

    .ai-not-logged-in {
        padding: 20px 14px;
        color: #718096;
        font-size: 0.85rem;
        text-align: center;
        line-height: 1.5;
    }
    .ai-not-logged-in a { color: #c05621; }
    `;

    const styleEl = document.createElement('style');
    styleEl.textContent = CSS;
    document.head.appendChild(styleEl);

    // ── Build DOM ─────────────────────────────────────────────────────────────
    const btn = document.createElement('button');
    btn.id = 'ai-widget-btn';
    btn.title = "Buckshot — Mike's AI";
    btn.innerHTML = '<img src="ai-widget-logo.png" alt="AI" style="width:30px;height:30px;object-fit:contain;mix-blend-mode:darken;"><span class="ai-notif" id="ai-notif"></span>';

    const panel = document.createElement('div');
    panel.id = 'ai-widget-panel';
    panel.innerHTML = `
        <div class="ai-panel-header">
            <span class="ai-avatar"><img src="ai-widget-logo.png" alt="" style="width:20px;height:20px;object-fit:contain;vertical-align:middle;mix-blend-mode:darken;"></span>
            <div class="ai-title">Buckshot<div class="ai-subtitle">Sky ads · Hours · Taxes</div></div>
            <button id="ai-close-btn" title="Close">✕</button>
        </div>
        <div id="ai-messages"></div>
        <div class="ai-chips" id="ai-chips">
            <button class="ai-chip" data-p="How many hours am I at?">⏱️ My hours</button>
            <button class="ai-chip" data-p="How much do I owe in taxes?">💰 My taxes</button>
            <button class="ai-chip" data-p="Write me a sky ad advertising that Mike's buys fish from players">🎣 Fishing ad</button>
            <button class="ai-chip" data-p="Write me a sky ad for hunting gear at Mike's Sporting Goods">🦌 Hunting ad</button>
            <button class="ai-chip" data-p="Write me a few sky ad options to promote Mike's Sporting Goods">🎉 Store ads</button>
        </div>
        <div class="ai-input-row">
            <textarea id="ai-input" rows="1" placeholder='Ask me anything…'></textarea>
            <button id="ai-send-btn">➤</button>
        </div>
        <div class="ai-disclaimer">⚠️ Buckshot can make mistakes — always double-check ads before posting.</div>
    `;

    document.body.appendChild(btn);
    document.body.appendChild(panel);

    // ── Hide button until logged in ───────────────────────────────────────────
    if (!loggedInName) {
        btn.style.display = 'none';
    }

    // Show button if login happens on this page without a reload
    window.addEventListener('storage', e => {
        if (e.key === 'loggedInEmployeeName' && e.newValue) {
            btn.style.display = '';
        }
    });

    // ── Toggle open/close ─────────────────────────────────────────────────────
    btn.addEventListener('click', () => {
        isOpen = !isOpen;
        panel.classList.toggle('open', isOpen);
        if (isOpen) {
            document.getElementById('ai-notif').style.display = 'none';
            // Greet on first open
            if (document.getElementById('ai-messages').children.length === 0) {
                initChat();
            }
            setTimeout(() => document.getElementById('ai-input')?.focus(), 50);
        }
    });

    document.getElementById('ai-close-btn').addEventListener('click', () => {
        isOpen = false;
        panel.classList.remove('open');
    });

    // Chips
    panel.querySelectorAll('.ai-chip').forEach(c => {
        c.addEventListener('click', () => {
            document.getElementById('ai-input').value = c.dataset.p;
            handleSend();
        });
    });

    // Send button + Enter key
    document.getElementById('ai-send-btn').addEventListener('click', handleSend);
    document.getElementById('ai-input').addEventListener('keydown', e => {
        if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
    });

    // Auto-grow textarea
    document.getElementById('ai-input').addEventListener('input', function () {
        this.style.height = 'auto';
        this.style.height = Math.min(this.scrollHeight, 80) + 'px';
    });

    // ── Init chat ─────────────────────────────────────────────────────────────
    function initChat() {
        if (!loggedInName) {
            const msgBox = document.getElementById('ai-messages');
            const el = document.createElement('div');
            el.className = 'ai-not-logged-in';
            el.innerHTML = `Log in on the <a href="index.html">POS page</a> first so I know who you are.`;
            msgBox.appendChild(el);
            // Hide chips + input
            document.getElementById('ai-chips').style.display = 'none';
            document.querySelector('.ai-input-row').style.display = 'none';
            return;
        }

        addBotMsg(`Hey ${loggedInName}! 👋 I'm Buckshot — need a sky ad, want to check your hours, or see your taxes?`);

        // Start loading hours + taxes in background
        if (window.isFirebaseReady && window.db) {
            loadHours();
            loadTaxes();
        } else {
            document.addEventListener('firebaseReady', () => { loadHours(); loadTaxes(); }, { once: true });
        }
    }

    // ── Load hours from timeClock collection ──────────────────────────────────
    async function loadHours() {
        if (hoursLoaded || !loggedInName || !window.db || typeof MikesTimeClock === 'undefined') return;
        hoursLoaded = true;

        const fs = window.firestoreFunctions;
        const db = window.db;
        const TC = MikesTimeClock;

        try {
            // Find employee doc by name
            const empSnap = await fs.getDocs(
                fs.query(fs.collection(db, 'employees'), fs.where('fullName', '==', loggedInName))
            );
            if (empSnap.empty) { hoursCtx = 'Hours: employee record not found.'; return; }
            empDoc = { id: empSnap.docs[0].id, ...empSnap.docs[0].data() };

            // Load TC settings and period range
            const settings = await TC.loadSettings(db, fs);
            const now      = new Date();
            const range    = TC.periodRange(settings, now, 0);
            const req      = TC.requiredHours(settings);

            // Query shifts in period
            const tcCol = fs.collection(db, 'timeClock');
            const from  = new Date(range.start.getTime() - 2 * 86400000);
            const [rangeSnap, openSnap] = await Promise.all([
                fs.getDocs(fs.query(tcCol,
                    fs.where('employeeId', '==', empDoc.id),
                    fs.where('clockIn', '>=', fs.Timestamp.fromDate(from)),
                    fs.where('clockIn', '<',  fs.Timestamp.fromDate(range.end))
                )),
                fs.getDocs(fs.query(tcCol,
                    fs.where('employeeId', '==', empDoc.id),
                    fs.where('status', '==', 'open')
                ))
            ]);

            const byId = new Map();
            [...rangeSnap.docs, ...openSnap.docs].forEach(d => byId.set(d.id, { id: d.id, ...d.data() }));
            const shifts = [...byId.values()].filter(sh =>
                TC.toDate(sh.clockIn) < range.end &&
                (sh.status === 'open' || (TC.toDate(sh.clockOut) || now) > range.start)
            );

            const totalMins = shifts.reduce((m, sh) => m + TC.minutesInRange(sh, range.start, range.end, now), 0);
            const onShift   = shifts.some(sh => sh.status === 'open' && !TC.isStale(sh, settings, now));
            const exempt    = TC.isExempt(empDoc);
            const remaining = Math.max(0, req * 60 - totalMins);
            const hoursStr  = TC.fmtHM(totalMins);

            if (exempt) {
                hoursCtx = `Hours this ${range.period}: ${hoursStr} (exempt from requirement as ${empDoc.rank || 'your rank'})`;
            } else if (remaining === 0) {
                hoursCtx = `Hours this ${range.period}: ${hoursStr} of ${req}h required — ✅ MET!`;
            } else {
                hoursCtx = `Hours this ${range.period}: ${hoursStr} of ${req}h required — needs ${TC.fmtHM(remaining)} more`;
            }
            if (onShift) hoursCtx += ' (currently on shift)';
            hoursCtx += `. Period: ${range.label}.`;

        } catch (e) {
            console.warn('ai-widget: hours load failed', e);
            hoursCtx = 'Hours: could not be loaded right now.';
        }
    }

    // ── Load outstanding taxes from transactions collection ───────────────────
    async function loadTaxes() {
        if (!loggedInName || !window.db) return;

        const fs = window.firestoreFunctions;
        const db = window.db;

        try {
            const taxSnap = await fs.getDocs(
                fs.query(
                    fs.collection(db, 'transactions'),
                    fs.where('employeeName', '==', loggedInName),
                    fs.where('taxesCleared', '==', false)
                )
            );
            let totalTax = 0;
            let txCount  = 0;
            taxSnap.forEach(d => {
                const amt = d.data().taxAmountPaidToMikes;
                if (typeof amt === 'number' && amt > 0) { totalTax += amt; txCount++; }
            });
            taxCtx = totalTax > 0
                ? `Outstanding taxes owed: $${totalTax.toLocaleString()} (${txCount} uncleared transaction${txCount !== 1 ? 's' : ''})`
                : 'Outstanding taxes owed: $0 (all clear ✅)';
        } catch (e) {
            console.warn('ai-widget: taxes load failed', e);
            taxCtx = 'Outstanding taxes: could not be loaded right now.';
        }
    }

    // ── Build context for Worker ───────────────────────────────────────────────
    function buildContext() {
        let ctx = `Employee: ${loggedInName || 'unknown'}`;
        if (empDoc?.rank) ctx += `\nRank: ${empDoc.rank}`;
        if (hoursCtx)     ctx += `\n${hoursCtx}`;
        if (taxCtx)       ctx += `\n${taxCtx}`;

        // Scrape live POS item prices from the page DOM (includes HAC + Firestore items)
        const posItems = [];
        document.querySelectorAll('#pos-items-container .item[data-price]').forEach(el => {
            const pEl = el.querySelector('p');
            if (!pEl) return;
            // Text is "Item Name $50,000" — split on $ to get name
            const name = pEl.textContent.split('$')[0].trim();
            const price = parseInt(el.dataset.price, 10);
            const cat   = el.dataset.category || '';
            if (name && !isNaN(price)) {
                posItems.push(`  • ${name} — $${price.toLocaleString()} [${cat}]`);
            }
        });
        if (posItems.length > 0) {
            ctx += `\n\nCURRENT POS ITEM PRICES (from the store right now):\n${posItems.join('\n')}`;
        }

        return ctx;
    }

    // ── Cooldown display — runs after a send, ticks countdown on button ────────
    function startCooldownDisplay() {
        const sendBtn = document.getElementById('ai-send-btn');
        if (!sendBtn) return;
        const endAt = lastSentAt + SEND_COOLDOWN_MS;

        const tick = () => {
            const left = endAt - Date.now();
            if (left <= 0) {
                // Cooldown expired — re-enable only if AI is also done
                if (!isBusy) {
                    sendBtn.disabled = false;
                    sendBtn.classList.remove('cooldown');
                    sendBtn.textContent = '➤';
                }
                return; // stop ticking
            }
            // Still in cooldown — show countdown only while AI is not processing
            if (!isBusy) {
                sendBtn.disabled = true;
                sendBtn.classList.add('cooldown');
                sendBtn.textContent = Math.ceil(left / 1000) + 's';
            }
            setTimeout(tick, 500);
        };
        setTimeout(tick, 500);
    }

    // ── Handle send ───────────────────────────────────────────────────────────
    async function handleSend() {
        if (isBusy) return;

        // Enforce general send cooldown
        if (Date.now() - lastSentAt < SEND_COOLDOWN_MS) return;

        const input   = document.getElementById('ai-input');
        const sendBtn = document.getElementById('ai-send-btn');
        const text    = input.value.trim();
        if (!text) return;

        lastSentAt = Date.now();
        input.value = '';
        input.style.height = 'auto';
        isBusy = true;
        sendBtn.disabled = true;
        sendBtn.classList.remove('cooldown');
        sendBtn.textContent = '➤';

        // Start cooldown countdown running in background
        startCooldownDisplay();

        addUserMsg(text);
        history.push({ role: 'user', content: text });

        const typing = addTyping();

        // Refresh live data — but only if not fetched recently (rate-limit guard)
        const now = Date.now();
        if (/tax|owe|balance|outstanding/i.test(text)) {
            if (now - lastTaxFetchAt >= DATA_COOLDOWN_MS) {
                await loadTaxes();
                lastTaxFetchAt = Date.now();
            }
        }
        if (/hour|shift|clock|time|worked|requirement/i.test(text)) {
            if (now - lastHoursFetchAt >= DATA_COOLDOWN_MS) {
                hoursLoaded = false;
                await loadHours();
                lastHoursFetchAt = Date.now();
            }
        }

        let reply;
        try {
            // Cap history at last 6 messages to stay under TPM limits
            const trimmedHistory = history.slice(-6);
            reply = await callWorker(trimmedHistory, buildContext());
        } catch (err) {
            reply = '⚠️ Couldn\'t reach the AI. Check your connection and try again.';
            console.error('ai-widget worker error:', err);
        }

        typing.remove();
        addBotMsg(reply);
        history.push({ role: 'assistant', content: reply });

        isBusy = false;

        // Re-enable button only if cooldown has already expired
        const cdLeft = (lastSentAt + SEND_COOLDOWN_MS) - Date.now();
        if (cdLeft <= 0) {
            sendBtn.disabled = false;
            sendBtn.classList.remove('cooldown');
            sendBtn.textContent = '➤';
        } else {
            // Show remaining countdown — startCooldownDisplay will re-enable when done
            sendBtn.disabled = true;
            sendBtn.classList.add('cooldown');
            sendBtn.textContent = Math.ceil(cdLeft / 1000) + 's';
        }

        input.focus();

        // If panel is closed, show notification dot
        if (!isOpen) {
            document.getElementById('ai-notif').style.display = 'block';
        }
    }

    // ── Worker fetch ──────────────────────────────────────────────────────────
    async function callWorker(msgs, ctx) {
        const res = await fetch(WORKER_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ messages: msgs, employeeContext: ctx }),
        });
        if (!res.ok) {
            const err = await res.json().catch(() => ({}));
            throw new Error(err.detail || `HTTP ${res.status}`);
        }
        return (await res.json()).reply;
    }

    // ── Message rendering ─────────────────────────────────────────────────────
    function addUserMsg(text) {
        const el = document.createElement('div');
        el.className = 'ai-msg user';
        el.innerHTML = `<div class="ai-bubble">${esc(text)}</div>`;
        append(el);
    }

    function addBotMsg(text) {
        const el = document.createElement('div');
        el.className = 'ai-msg bot';

        const rendered = text.split('\n').map(line =>
            line.trim().startsWith('/ad ')
                ? `<code class="ai-ad-code">${esc(line.trim())}</code>`
                : esc(line)
        ).join('\n');

        el.innerHTML = `<div class="ai-bubble">${rendered}</div>`;
        append(el);

        // Copy button under each /ad block
        el.querySelectorAll('.ai-ad-code').forEach(codeEl => {
            const btn = document.createElement('button');
            btn.className = 'ai-copy-btn';
            btn.textContent = '📋 Copy';
            btn.addEventListener('click', () => {
                navigator.clipboard.writeText(codeEl.textContent.trim()).then(() => {
                    btn.textContent = '✅ Copied!';
                    setTimeout(() => { btn.textContent = '📋 Copy'; }, 2000);
                });
            });
            el.appendChild(btn);
        });
    }

    function addTyping() {
        const el = document.createElement('div');
        el.className = 'ai-msg bot';
        el.innerHTML = '<div class="ai-typing">Thinking…</div>';
        append(el);
        return el;
    }

    function append(el) {
        const box = document.getElementById('ai-messages');
        box.appendChild(el);
        box.scrollTop = box.scrollHeight;
    }

    function esc(s) {
        return String(s)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;');
    }

})();
