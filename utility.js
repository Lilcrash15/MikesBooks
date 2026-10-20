// utility.js - Mike's Staff Portal (shared by every page)

const EMPLOYEE_SESSION_KEY = 'isEmployeeAccessGranted_PumpDump';
const MANAGER_SESSION_KEY = 'isManagerAccessGranted_PumpDump';

function checkEmployeeSession() {
    return localStorage.getItem(EMPLOYEE_SESSION_KEY) === 'true';
}

function grantEmployeeSession() {
    localStorage.setItem(EMPLOYEE_SESSION_KEY, 'true');
}

function checkManagerSession() {
    return localStorage.getItem(MANAGER_SESSION_KEY) === 'true' && checkEmployeeSession();
}

function grantManagerSession() {
    localStorage.setItem(EMPLOYEE_SESSION_KEY, 'true');
    localStorage.setItem(MANAGER_SESSION_KEY, 'true');
}

// A page can set window.beforeLogout = async () => {...} (the POS uses it to offer a clock-out).
async function clearAllSessions() {
    if (typeof window.beforeLogout === 'function') {
        try { await window.beforeLogout(); } catch (e) { console.error('beforeLogout failed:', e); }
    }
    window.mikesInternalNav = true; // logging out reloads the page — no "leave site?" warning for that
    localStorage.removeItem(ON_SHIFT_KEY);
    localStorage.removeItem(EMPLOYEE_SESSION_KEY);
    localStorage.removeItem(MANAGER_SESSION_KEY);
    localStorage.removeItem('loggedInEmployeeName');
    localStorage.removeItem('loggedInEmployeeId');

    const logoutLink = document.getElementById('logout-link');
    if (logoutLink && logoutLink.parentNode) logoutLink.parentNode.removeChild(logoutLink);

    const currentPage = window.location.pathname.split("/").pop() || "index.html";
    const loginPages = ["index.html", "commission.html", "manager.html", ""];
    if (loginPages.includes(currentPage)) {
        window.location.reload();
    } else {
        window.location.href = 'index.html';
    }
}

function addLogoutButton() {
    const navLinks = document.getElementById('topnav-links');
    if (navLinks && !document.getElementById('logout-link')) {
        const logoutLink = document.createElement('a');
        logoutLink.href = "#";
        logoutLink.id = 'logout-link';
        logoutLink.className = 'topnav-link';
        logoutLink.textContent = '⎋ Logout';
        logoutLink.addEventListener('click', (e) => { e.preventDefault(); clearAllSessions(); });
        navLinks.appendChild(logoutLink);
    }
}

document.addEventListener("DOMContentLoaded", () => {
    // Topnav is always visible — no hover logic needed
});

// ============================================================
// "Don't forget to clock out" when closing the tab while clocked in.
// Browsers show their own wording ("Leave site?") — a site can't change that text.
// Clicking the site's own links doesn't warn; closing the tab or refreshing does.
// ============================================================
const ON_SHIFT_KEY = 'mikesOnShiftId';

function markOnShift(shiftId) {
    if (shiftId) localStorage.setItem(ON_SHIFT_KEY, shiftId); else localStorage.removeItem(ON_SHIFT_KEY);
}

function isMarkedOnShift() {
    return checkEmployeeSession() && !!localStorage.getItem(ON_SHIFT_KEY);
}

document.addEventListener('click', (e) => {
    const a = e.target.closest && e.target.closest('a[href]');
    if (!a || a.target === '_blank' || e.defaultPrevented) return;
    try {
        const url = new URL(a.getAttribute('href'), location.href);
        if (url.origin === location.origin) {
            window.mikesInternalNav = true;           // moving around the site, not leaving it
            setTimeout(() => { window.mikesInternalNav = false; }, 3000); // in case the click didn't navigate
        }
    } catch (err) { /* not a real link */ }
}, true);

window.addEventListener('beforeunload', (e) => {
    if (window.mikesInternalNav || !isMarkedOnShift()) return;
    e.preventDefault();
    e.returnValue = "Don't forget to clock out!"; // shown only by very old browsers
    return e.returnValue;
});

// ============================================================
// TIME CLOCK — shared rules (POS page, manager page; LCAI uses the same rules)
//
// Firestore:
//   timeClock/{id}  { employeeId, employeeName, rank, isManager,
//                     clockIn: Timestamp, clockOut: Timestamp|null,
//                     status: "open" | "closed",
//                     closedBy: "self" | "last-sale" | "manager",
//                     flagged: bool, flagReason: string|null,
//                     editedBy: string|null, editedAt: Timestamp|null }
//   siteSettings/timeClock  { period: "month"|"week", requiredHoursWeek: 2,
//                             requiredHoursMonth: 8, weekStartsOn: "Monday",
//                             timezone: "America/New_York", staleHours: 12 }
// Managers have no hour requirement.
// A shift still open after staleHours is "forgotten": it closes at that
// employee's last sale during the shift (or at clock-in if they made none)
// and is flagged for a manager to check.
// ============================================================
const MikesTimeClock = (() => {
    const DEFAULTS = {
        period: 'month',
        requiredHoursWeek: 2,
        requiredHoursMonth: 8,
        weekStartsOn: 'Monday',
        timezone: 'America/New_York',
        staleHours: 12
    };

    async function loadSettings(db, fs) {
        try {
            const snap = await fs.getDoc(fs.doc(db, 'siteSettings', 'timeClock'));
            return Object.assign({}, DEFAULTS, snap.exists() ? snap.data() : {});
        } catch (e) {
            console.error('Time clock settings not loaded, using defaults:', e);
            return Object.assign({}, DEFAULTS);
        }
    }

    function isExempt(emp) {
        return !!emp && (emp.isManager === true || emp.rank === 'Manager');
    }

    function requiredHours(settings, period) {
        return (period || settings.period) === 'week' ? Number(settings.requiredHoursWeek) : Number(settings.requiredHoursMonth);
    }

    function toDate(v) {
        if (!v) return null;
        if (v instanceof Date) return v;
        if (typeof v.toDate === 'function') return v.toDate();
        if (typeof v.seconds === 'number') return new Date(v.seconds * 1000);
        return new Date(v);
    }

    // y/m/d/weekday of an instant as seen in the shop's time zone
    function zonedParts(date, tz) {
        const parts = new Intl.DateTimeFormat('en-US', {
            timeZone: tz, year: 'numeric', month: 'numeric', day: 'numeric', weekday: 'short'
        }).formatToParts(date);
        const get = t => parts.find(p => p.type === t).value;
        const wd = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(get('weekday'));
        return { y: +get('year'), m: +get('month'), d: +get('day'), wd };
    }

    function tzOffsetMs(utcMs, tz) {
        const p = new Intl.DateTimeFormat('en-US', {
            timeZone: tz, hourCycle: 'h23', year: 'numeric', month: 'numeric', day: 'numeric',
            hour: 'numeric', minute: 'numeric', second: 'numeric'
        }).formatToParts(new Date(utcMs));
        const g = t => +p.find(x => x.type === t).value;
        return Date.UTC(g('year'), g('month') - 1, g('day'), g('hour'), g('minute'), g('second')) - utcMs;
    }

    // Midnight at the start of y-m-d in the shop's time zone, as a Date
    function zonedMidnight(y, m, d, tz) {
        const guess = Date.UTC(y, m - 1, d);
        let t = guess - tzOffsetMs(guess, tz);
        t = guess - tzOffsetMs(t, tz);
        return new Date(t);
    }

    // { start, end, label } for the period containing `ref` (offset -1 = the one before)
    function periodRange(settings, ref, offset, periodOverride) {
        const tz = settings.timezone || DEFAULTS.timezone;
        const period = periodOverride || settings.period;
        const p = zonedParts(ref || new Date(), tz);
        offset = offset || 0;
        if (period === 'week') {
            const startDow = (settings.weekStartsOn || 'Monday') === 'Sunday' ? 0 : 1;
            const back = (p.wd - startDow + 7) % 7;
            const base = new Date(Date.UTC(p.y, p.m - 1, p.d - back + offset * 7));
            const start = zonedMidnight(base.getUTCFullYear(), base.getUTCMonth() + 1, base.getUTCDate(), tz);
            const next = new Date(Date.UTC(base.getUTCFullYear(), base.getUTCMonth(), base.getUTCDate() + 7));
            const end = zonedMidnight(next.getUTCFullYear(), next.getUTCMonth() + 1, next.getUTCDate(), tz);
            const fmtD = dt => dt.toLocaleDateString('en-US', { timeZone: tz, month: 'short', day: 'numeric' });
            return { start, end, period, label: `Week of ${fmtD(start)} – ${fmtD(new Date(end - 1))}` };
        }
        const first = new Date(Date.UTC(p.y, p.m - 1 + offset, 1));
        const start = zonedMidnight(first.getUTCFullYear(), first.getUTCMonth() + 1, 1, tz);
        const nextM = new Date(Date.UTC(first.getUTCFullYear(), first.getUTCMonth() + 1, 1));
        const end = zonedMidnight(nextM.getUTCFullYear(), nextM.getUTCMonth() + 1, 1, tz);
        const label = start.toLocaleDateString('en-US', { timeZone: tz, month: 'long', year: 'numeric' });
        return { start, end, period, label };
    }

    // Minutes of a shift that fall inside [start, end). Open shifts count up to `now`.
    function minutesInRange(shift, start, end, now) {
        const a = toDate(shift.clockIn);
        if (!a) return 0;
        const b = toDate(shift.clockOut) || (now || new Date());
        const s = Math.max(a.getTime(), start.getTime());
        const e = Math.min(b.getTime(), end.getTime());
        return e > s ? Math.round((e - s) / 60000) : 0;
    }

    function isStale(shift, settings, now) {
        if (shift.status !== 'open' || shift.clockOut) return false;
        const a = toDate(shift.clockIn);
        return !!a && ((now || new Date()) - a) > (Number(settings.staleHours) || 12) * 3600000;
    }

    function fmtHM(minutes) {
        minutes = Math.max(0, Math.round(minutes || 0));
        const h = Math.floor(minutes / 60), m = minutes % 60;
        return h ? `${h}h ${String(m).padStart(2, '0')}m` : `${m}m`;
    }

    // Latest transaction by this employee between clock-in and `until`.
    // Single-field range query (no composite index needed); filtered by name here.
    async function lastSaleDuring(db, fs, shift, until) {
        const a = toDate(shift.clockIn);
        const q = fs.query(fs.collection(db, 'transactions'), fs.where('createdAt', '>=', a));
        const snap = await fs.getDocs(q);
        let last = null;
        snap.forEach(d => {
            const t = d.data();
            if (t.employeeName !== shift.employeeName) return;
            const c = toDate(t.createdAt);
            if (c && c <= until && (!last || c > last)) last = c;
        });
        return last;
    }

    // Close a forgotten shift at the last sale (or at clock-in) and flag it.
    async function closeStaleShift(db, fs, shiftId, shift) {
        const now = new Date();
        const lastSale = await lastSaleDuring(db, fs, shift, now);
        const end = lastSale || toDate(shift.clockIn);
        const update = {
            clockOut: fs.Timestamp ? fs.Timestamp.fromDate(end) : end,
            status: 'closed',
            closedBy: 'last-sale',
            flagged: true,
            flagReason: lastSale ? 'Forgot to clock out — closed at last sale' : 'Forgot to clock out — no sales, counted as 0'
        };
        await fs.updateDoc(fs.doc(db, 'timeClock', shiftId), update);
        return Object.assign({}, shift, update, { clockOut: end });
    }

    return {
        DEFAULTS, loadSettings, isExempt, requiredHours, toDate, periodRange,
        minutesInRange, isStale, fmtHM, lastSaleDuring, closeStaleShift
    };
})();
