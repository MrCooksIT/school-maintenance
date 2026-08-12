// tests/slotLogic.test.mjs
//
// Pure unit tests for the slot maths that makes double-booking impossible.
// No emulator needed.  Run with:  npm run test:slots

import {
    slotKeysForRange, rangesOverlap, daySlots, floorToSlot, ceilToSlot
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

console.log(`\n${pass} passed, ${fail} failed\n`);
process.exit(fail ? 1 : 0);
