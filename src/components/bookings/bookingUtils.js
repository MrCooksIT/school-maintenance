// src/components/bookings/bookingUtils.js
//
// Slot maths for the booking system.
//
// Every booking claims a set of fixed 15-minute slots in bookingSlots/{assetId}/.
// Those slot keys are what actually make double-booking impossible: the security
// rules only allow writing a slot key that does not already exist, and the whole
// booking is written as a single atomic multi-path update. If any one slot is
// taken, the server rejects the entire write - there is no window between
// checking and writing for a second teacher to slip through.

export const SLOT_MINUTES = 15;

// A week of slots. Guards against someone booking a room until the heat death of
// the universe and generating an unbounded write.
export const MAX_SLOTS_PER_BOOKING = (7 * 24 * 60) / SLOT_MINUTES;

const pad = (n) => String(n).padStart(2, '0');

/**
 * Slot key for a moment in time: "20260812-0915".
 * Lexicographic order matches chronological order, which makes range queries
 * over the slot index straightforward.
 */
export function slotKey(date) {
    const d = new Date(date);
    return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}-${pad(d.getHours())}${pad(d.getMinutes())}`;
}

/** Round down to the slot boundary that contains this time. */
export function floorToSlot(date) {
    const d = new Date(date);
    d.setSeconds(0, 0);
    d.setMinutes(Math.floor(d.getMinutes() / SLOT_MINUTES) * SLOT_MINUTES);
    return d;
}

/** Round up to the next slot boundary (leaves exact boundaries alone). */
export function ceilToSlot(date) {
    const d = new Date(date);
    d.setSeconds(0, 0);
    const rem = d.getMinutes() % SLOT_MINUTES;
    if (rem !== 0) d.setMinutes(d.getMinutes() + (SLOT_MINUTES - rem));
    return d;
}

/**
 * Every slot key a booking occupies.
 *
 * The end time is exclusive: a 09:00-10:00 booking holds 0900, 0915, 0930, 0945
 * but NOT 1000, so a 10:00-11:00 booking directly after it is not a conflict.
 */
export function slotKeysForRange(start, end) {
    const from = floorToSlot(start);
    const to = ceilToSlot(end);

    if (!(to > from)) {
        throw new Error('Booking must end after it starts.');
    }

    const keys = [];
    const cursor = new Date(from);
    while (cursor < to) {
        keys.push(slotKey(cursor));
        cursor.setMinutes(cursor.getMinutes() + SLOT_MINUTES);
        if (keys.length > MAX_SLOTS_PER_BOOKING) {
            throw new Error('A single booking cannot run longer than 7 days.');
        }
    }
    return keys;
}

/** Do two [start, end) ranges overlap? Touching at the boundary does not count. */
export function rangesOverlap(aStart, aEnd, bStart, bEnd) {
    return aStart < bEnd && bStart < aEnd;
}

/** Bookings that still hold their slots - i.e. the ones that block a time. */
export const BLOCKING_STATUSES = ['pending', 'confirmed'];

export function isBlocking(booking) {
    return BLOCKING_STATUSES.includes(booking?.status);
}

// ---------------------------------------------------------------------------
// Formatting helpers - kept here so the calendar, the dashboard and the
// approval queue all render times identically.
// ---------------------------------------------------------------------------

export function formatTime(ms) {
    return new Date(ms).toLocaleTimeString('en-ZA', { hour: '2-digit', minute: '2-digit', hour12: false });
}

export function formatDate(ms) {
    return new Date(ms).toLocaleDateString('en-ZA', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
}

export function formatRange(start, end) {
    const sameDay = new Date(start).toDateString() === new Date(end).toDateString();
    return sameDay
        ? `${formatDate(start)}, ${formatTime(start)}-${formatTime(end)}`
        : `${formatDate(start)} ${formatTime(start)} - ${formatDate(end)} ${formatTime(end)}`;
}

/** "yyyy-MM-dd" in local time, for <input type="date"> and day navigation. */
export function toDateInputValue(date) {
    const d = new Date(date);
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** "HH:mm" in local time, for <input type="time">. */
export function toTimeInputValue(date) {
    const d = new Date(date);
    return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** Combine a "yyyy-MM-dd" and an "HH:mm" into a local Date. */
export function fromDateTimeInputs(dateStr, timeStr) {
    const [y, m, d] = dateStr.split('-').map(Number);
    const [hh, mm] = timeStr.split(':').map(Number);
    return new Date(y, m - 1, d, hh, mm, 0, 0);
}

export const DEFAULT_HOURS = { dayStart: '07:00', dayEnd: '17:00' };

/**
 * The slot ladder shown for one asset on one day, e.g. 07:00, 07:30, ... 16:30.
 * Display granularity is coarser than the 15-minute locking granularity so the
 * mobile view stays thumb-sized; stepMinutes must be a multiple of SLOT_MINUTES.
 */
export function daySlots(day, hours = DEFAULT_HOURS, stepMinutes = 30) {
    const { dayStart, dayEnd } = { ...DEFAULT_HOURS, ...(hours || {}) };

    // Fall back to the defaults rather than rendering nothing if an asset was
    // saved with a malformed time.
    const parse = (value, fallback) => {
        const [h, m] = String(value ?? '').split(':').map(Number);
        return Number.isFinite(h) && Number.isFinite(m) ? [h, m] : fallback;
    };
    const [sh, sm] = parse(dayStart, [7, 0]);
    const [eh, em] = parse(dayEnd, [17, 0]);

    const base = new Date(day);
    const cursor = new Date(base.getFullYear(), base.getMonth(), base.getDate(), sh, sm, 0, 0);
    const stop = new Date(base.getFullYear(), base.getMonth(), base.getDate(), eh, em, 0, 0);

    // "05:00 - 00:00" means open until midnight, not a zero-length day. Any end
    // at or before the start rolls over to the following morning, which also
    // covers genuinely overnight assets.
    if (stop <= cursor) {
        stop.setDate(stop.getDate() + 1);
    }

    const out = [];
    while (cursor < stop) {
        const start = new Date(cursor);
        cursor.setMinutes(cursor.getMinutes() + stepMinutes);
        out.push({ start: start.getTime(), end: Math.min(cursor.getTime(), stop.getTime()) });
    }
    return out;
}
