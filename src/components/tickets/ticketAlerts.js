// src/components/tickets/ticketAlerts.js
//
// Which tickets need chasing. Kept free of React so it can be unit tested.

/** Tickets that are finished, deleted or filed as duplicates need no chasing. */
export function isActionable(ticket) {
    if (!ticket) return false;
    if (ticket.isDeleted === true) return false;
    return !['completed', 'deleted', 'duplicate'].includes(ticket.status);
}

export function isUnassigned(ticket) {
    return isActionable(ticket) && !ticket.assignedTo;
}

/**
 * Due dates are stored as "YYYY-MM-DD". Parsing that with `new Date()` gives
 * UTC midnight, which in South Africa reads as 02:00 the same morning - close
 * enough to flip a ticket a day early or late. Build a local date instead.
 */
export function parseDueDate(value) {
    if (!value) return null;
    const match = String(value).match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (match) {
        return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
    }
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return null;
    return new Date(parsed.getFullYear(), parsed.getMonth(), parsed.getDate());
}

function startOfToday(now) {
    const d = new Date(now);
    d.setHours(0, 0, 0, 0);
    return d;
}

/** Past its due date and still not done. Due *today* is not yet overdue. */
export function isOverdue(ticket, now = new Date()) {
    if (!isActionable(ticket)) return false;
    const due = parseDueDate(ticket.dueDate);
    if (!due) return false;
    return due < startOfToday(now);
}

/** Whole days past the due date. 0 if not overdue. */
export function daysOverdue(ticket, now = new Date()) {
    if (!isOverdue(ticket, now)) return 0;
    const due = parseDueDate(ticket.dueDate);
    return Math.round((startOfToday(now) - due) / (24 * 60 * 60 * 1000));
}

/**
 * Both alert groups in one pass.
 *
 * A ticket can appear in both - unassigned and overdue is the worst case, and
 * hiding it from one list would understate the problem.
 */
export function getTicketAlerts(tickets, now = new Date()) {
    const list = Array.isArray(tickets) ? tickets : [];

    const unassigned = list.filter((t) => isUnassigned(t));
    const overdue = list.filter((t) => isOverdue(t, now));

    const worst = overdue.reduce((max, t) => Math.max(max, daysOverdue(t, now)), 0);

    return {
        unassigned,
        overdue,
        unassignedCount: unassigned.length,
        overdueCount: overdue.length,
        worstDaysOverdue: worst
    };
}
