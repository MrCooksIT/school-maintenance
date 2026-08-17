// tests/slotLogic.test.mjs
//
// Pure unit tests for the slot maths that makes double-booking impossible.
// No emulator needed.  Run with:  npm run test:slots

import {
    slotKeysForRange, rangesOverlap, daySlots, floorToSlot, ceilToSlot,
    startOfWeek, weekDays, monthGrid, addDays, isSameDay, bookingsOnDay
} from '../src/components/bookings/bookingUtils.js';

let pass = 0, fail = 0;
const check = (name, cond, extra = '') => {
    if (cond) { pass++; console.log(`  ok   ${name}`); }
    else { fail++; console.log(`  FAIL ${name} ${extra}`); }
};

const at = (h, m = 0) => new Date(2026, 7, 12, h, m).getTime();

console.log('\nslotKeysForRange');
const a = slotKeysForRange(at(9), at(10));
check('09:00-10:00 gives 4 slots', a.length === 4, JSON.stringify(a));
check('starts at 0900', a[0] === '20260812-0900', a[0]);
check('last slot is 0945, not 1000', a[a.length - 1] === '20260812-0945', a[a.length - 1]);
check('end is exclusive - 1000 not held', !a.includes('20260812-1000'));

console.log('\nback-to-back bookings do not collide');
const first = new Set(slotKeysForRange(at(9), at(10)));
const second = slotKeysForRange(at(10), at(11));
check('no shared slot keys', second.every(k => !first.has(k)));

console.log('\noverlapping bookings do collide');
const overlap = slotKeysForRange(at(9, 30), at(10, 30));
check('shares at least one slot', overlap.some(k => first.has(k)));

console.log('\nragged times get rounded outward');
const ragged = slotKeysForRange(at(9, 7), at(9, 52));
check('09:07 floors to 0900', ragged[0] === '20260812-0900', ragged[0]);
check('09:52 ceils to 10:00 so 0945 is held', ragged[ragged.length - 1] === '20260812-0945', ragged[ragged.length - 1]);
check('a 7-past booking still blocks a 9:00 booking', ragged.some(k => first.has(k)));

console.log('\nrounding helpers');
check('floorToSlot 09:07 -> 09:00', floorToSlot(at(9, 7)).getMinutes() === 0);
check('ceilToSlot 09:52 -> 10:00', ceilToSlot(at(9, 52)).getHours() === 10);
check('ceilToSlot leaves exact boundary alone', ceilToSlot(at(9, 30)).getMinutes() === 30);

console.log('\ncrossing midnight');
const overnight = slotKeysForRange(new Date(2026, 7, 12, 23, 0).getTime(), new Date(2026, 7, 13, 1, 0).getTime());
check('spans two dates', overnight[0].startsWith('20260812') && overnight[overnight.length - 1].startsWith('20260813'));
check('8 slots over 2 hours', overnight.length === 8, String(overnight.length));

console.log('\nguards');
try { slotKeysForRange(at(10), at(9)); check('rejects end before start', false); }
catch { check('rejects end before start', true); }
try { slotKeysForRange(at(10), at(10)); check('rejects zero length', false); }
catch { check('rejects zero length', true); }
try {
    slotKeysForRange(new Date(2026, 0, 1).getTime(), new Date(2026, 3, 1).getTime());
    check('rejects absurdly long booking', false);
} catch { check('rejects absurdly long booking', true); }

console.log('\nrangesOverlap');
check('touching ranges do not overlap', !rangesOverlap(at(9), at(10), at(10), at(11)));
check('genuine overlap detected', rangesOverlap(at(9), at(10), at(9, 30), at(10, 30)));
check('containment detected', rangesOverlap(at(9), at(12), at(10), at(11)));

console.log('\ndaySlots');
const d = daySlots(new Date(2026, 7, 12), { dayStart: '07:00', dayEnd: '17:00' }, 30);
check('20 half-hour slots in a 10 hour day', d.length === 20, String(d.length));
check('first starts at 07:00', new Date(d[0].start).getHours() === 7);
check('last ends at 17:00', new Date(d[d.length - 1].end).getHours() === 17);

// Regression: three live assets were configured 05:00-00:00, meaning "open
// until midnight". That produced an end before the start and an empty calendar.
console.log('\ndaySlots - end at midnight (regression)');
const mid = daySlots(new Date(2026, 7, 12), { dayStart: '05:00', dayEnd: '00:00' }, 30);
check('05:00-00:00 is not empty', mid.length > 0, `got ${mid.length}`);
check('38 half-hour slots from 05:00 to midnight', mid.length === 38, String(mid.length));
check('first starts at 05:00', new Date(mid[0].start).getHours() === 5);
check('last slot ends at midnight next day',
    new Date(mid[mid.length - 1].end).getDate() === 13 && new Date(mid[mid.length - 1].end).getHours() === 0);

console.log('\ndaySlots - defensive');
const overnightLadder = daySlots(new Date(2026, 7, 12), { dayStart: '18:00', dayEnd: '06:00' }, 60);
check('overnight 18:00-06:00 gives 12 hourly slots', overnightLadder.length === 12, String(overnightLadder.length));
const bad = daySlots(new Date(2026, 7, 12), { dayStart: 'nonsense', dayEnd: null }, 30);
check('malformed hours fall back to defaults rather than rendering nothing', bad.length === 20, String(bad.length));
const missing = daySlots(new Date(2026, 7, 12), undefined, 30);
check('missing hours object falls back to defaults', missing.length === 20, String(missing.length));

console.log('\nweek navigation');
// 12 Aug 2026 is a Wednesday.
const wed = new Date(2026, 7, 12);
check('12 Aug 2026 is a Wednesday', wed.getDay() === 3, String(wed.getDay()));
const wkStart = startOfWeek(wed);
check('week starts Monday 10 Aug', wkStart.getDate() === 10 && wkStart.getDay() === 1,
    `${wkStart.getDate()}/${wkStart.getDay()}`);
const wk = weekDays(wed);
check('seven days in the week', wk.length === 7);
check('runs Mon 10 to Sun 16', wk[0].getDate() === 10 && wk[6].getDate() === 16,
    `${wk[0].getDate()}-${wk[6].getDate()}`);
check('a Monday is its own week start', startOfWeek(new Date(2026, 7, 10)).getDate() === 10);
check('a Sunday belongs to the week that began Monday',
    startOfWeek(new Date(2026, 7, 16)).getDate() === 10,
    String(startOfWeek(new Date(2026, 7, 16)).getDate()));

console.log('\nmonth grid');
const grid = monthGrid(new Date(2026, 7, 12));
check('always 42 cells', grid.length === 42, String(grid.length));
check('starts on a Monday', grid[0].getDay() === 1);
check('contains the whole of August', grid.some(d => d.getDate() === 1 && d.getMonth() === 7)
    && grid.some(d => d.getDate() === 31 && d.getMonth() === 7));
const febGrid = monthGrid(new Date(2028, 1, 1)); // leap year
check('leap February still 42 cells and includes the 29th',
    febGrid.length === 42 && febGrid.some(d => d.getMonth() === 1 && d.getDate() === 29));

console.log('\nhelpers');
check('isSameDay ignores time', isSameDay(new Date(2026, 7, 12, 3), new Date(2026, 7, 12, 22)));
check('isSameDay rejects different days', !isSameDay(new Date(2026, 7, 12), new Date(2026, 7, 13)));
check('addDays crosses a month boundary',
    addDays(new Date(2026, 7, 31), 1).getMonth() === 8);

console.log('\nbookingsOnDay');
const sample = [
    { id: 'a', status: 'confirmed', start: at(9), end: at(10) },
    { id: 'b', status: 'pending', start: at(11), end: at(12) },
    { id: 'c', status: 'cancelled', start: at(13), end: at(14) },
    { id: 'd', status: 'declined', start: at(15), end: at(16) },
    // spans midnight into 13 Aug
    { id: 'e', status: 'confirmed', start: new Date(2026, 7, 12, 23).getTime(), end: new Date(2026, 7, 13, 2).getTime() }
];
const onDay = bookingsOnDay(sample, new Date(2026, 7, 12));
check('excludes cancelled and declined', !onDay.some(b => ['c', 'd'].includes(b.id)));
check('includes confirmed and pending', onDay.some(b => b.id === 'a') && onDay.some(b => b.id === 'b'));
check('includes an overnight booking on its start day', onDay.some(b => b.id === 'e'));
const nextDay = bookingsOnDay(sample, new Date(2026, 7, 13));
check('overnight booking also appears on the following day',
    nextDay.length === 1 && nextDay[0].id === 'e', JSON.stringify(nextDay.map(b => b.id)));
check('sorted by start time', onDay.every((b, i, arr) => i === 0 || arr[i - 1].start <= b.start));

console.log(`\n${pass} passed, ${fail} failed\n`);
process.exit(fail ? 1 : 0);
