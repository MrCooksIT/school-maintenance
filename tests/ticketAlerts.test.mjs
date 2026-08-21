// tests/ticketAlerts.test.mjs
//   npm run test:alerts

import {
    isActionable, isUnassigned, isOverdue, daysOverdue, parseDueDate, getTicketAlerts
} from '../src/components/tickets/ticketAlerts.js';

let pass = 0, fail = 0;
const check = (name, cond, extra = '') => {
    if (cond) { pass++; console.log(`  ok   ${name}`); }
    else { fail++; console.log(`  FAIL ${name} ${extra}`); }
};

// Pretend "now" is midday on 21 Aug 2026.
const NOW = new Date(2026, 7, 21, 12, 0, 0);

console.log('\nactionable');
check('a new ticket is actionable', isActionable({ status: 'new' }));
check('in-progress is actionable', isActionable({ status: 'in-progress' }));
check('completed is not', !isActionable({ status: 'completed' }));
check('duplicate is not', !isActionable({ status: 'duplicate' }));
check('deleted status is not', !isActionable({ status: 'deleted' }));
check('isDeleted flag is not', !isActionable({ status: 'new', isDeleted: true }));
check('null is not', !isActionable(null));

console.log('\nunassigned');
check('no assignedTo is unassigned', isUnassigned({ status: 'new' }));
check('empty assignedTo is unassigned', isUnassigned({ status: 'new', assignedTo: '' }));
check('assigned is not', !isUnassigned({ status: 'new', assignedTo: '-OJilkNT' }));
check('completed but unassigned does not count', !isUnassigned({ status: 'completed' }));

console.log('\ndue date parsing');
check('parses YYYY-MM-DD as a local date', parseDueDate('2026-08-20').getDate() === 20);
check('month is correct (not off by one)', parseDueDate('2026-08-20').getMonth() === 7);
check('null for missing', parseDueDate(null) === null);
check('null for nonsense', parseDueDate('not a date') === null);
check('handles a full ISO string', parseDueDate('2026-08-20T09:00:00.000Z').getDate() === 20);

console.log('\noverdue');
check('yesterday is overdue', isOverdue({ status: 'new', dueDate: '2026-08-20' }, NOW));
check('today is NOT overdue', !isOverdue({ status: 'new', dueDate: '2026-08-21' }, NOW));
check('tomorrow is not overdue', !isOverdue({ status: 'new', dueDate: '2026-08-22' }, NOW));
check('no due date is not overdue', !isOverdue({ status: 'new' }, NOW));
check('completed is never overdue', !isOverdue({ status: 'completed', dueDate: '2026-01-01' }, NOW));
check('duplicate is never overdue', !isOverdue({ status: 'duplicate', dueDate: '2026-01-01' }, NOW));

console.log('\ndays overdue');
check('one day', daysOverdue({ status: 'new', dueDate: '2026-08-20' }, NOW) === 1,
    String(daysOverdue({ status: 'new', dueDate: '2026-08-20' }, NOW)));
check('twelve days', daysOverdue({ status: 'new', dueDate: '2026-08-09' }, NOW) === 12,
    String(daysOverdue({ status: 'new', dueDate: '2026-08-09' }, NOW)));
check('zero when not overdue', daysOverdue({ status: 'new', dueDate: '2026-08-25' }, NOW) === 0);
check('survives a month boundary', daysOverdue({ status: 'new', dueDate: '2026-07-31' }, NOW) === 21,
    String(daysOverdue({ status: 'new', dueDate: '2026-07-31' }, NOW)));

console.log('\ngetTicketAlerts');
const sample = [
    { id: 'a', status: 'new' },                                              // unassigned
    { id: 'b', status: 'new', assignedTo: 'x', dueDate: '2026-08-10' },      // overdue
    { id: 'c', status: 'new', dueDate: '2026-08-01' },                       // both
    { id: 'd', status: 'in-progress', assignedTo: 'x', dueDate: '2026-09-01' }, // healthy
    { id: 'e', status: 'completed', dueDate: '2026-01-01' },                 // done
    { id: 'f', status: 'duplicate' },                                        // filed
    { id: 'g', status: 'new', assignedTo: 'x', isDeleted: true, dueDate: '2026-01-01' }
];
const alerts = getTicketAlerts(sample, NOW);
check('counts 2 unassigned', alerts.unassignedCount === 2, String(alerts.unassignedCount));
check('counts 2 overdue', alerts.overdueCount === 2, String(alerts.overdueCount));
check('a ticket can be in both lists',
    alerts.unassigned.some(t => t.id === 'c') && alerts.overdue.some(t => t.id === 'c'));
check('excludes completed, duplicate and deleted',
    !alerts.unassigned.concat(alerts.overdue).some(t => ['e', 'f', 'g'].includes(t.id)));
check('worst is 20 days', alerts.worstDaysOverdue === 20, String(alerts.worstDaysOverdue));
check('empty input is safe', getTicketAlerts([], NOW).unassignedCount === 0);
check('undefined input is safe', getTicketAlerts(undefined, NOW).overdueCount === 0);

console.log(`\n${pass} passed, ${fail} failed\n`);
process.exit(fail ? 1 : 0);
