// tests/bookingRules.test.mjs
//
// Exercises database.rules.json against the Firebase emulator.
//
// The rules are the only thing preventing double-bookings and self-approval, so
// they are tested directly rather than trusted. This uses the real rules file and
// the real slot-key code from bookingUtils.js - not a reimplementation.
//
// Run with:  npm run test:rules

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import {
    initializeTestEnvironment,
    assertFails,
    assertSucceeds
} from '@firebase/rules-unit-testing';
import { ref, set, get, update } from 'firebase/database';
import { slotKeysForRange } from '../src/components/bookings/bookingUtils.js';

const here = dirname(fileURLToPath(import.meta.url));
const rules = readFileSync(join(here, '..', 'database.rules.json'), 'utf8');

// A "demo-" project id guarantees the emulator never reaches production.
const PROJECT_ID = 'demo-sjmc-bookings';

let passed = 0;
let failed = 0;
const failures = [];

async function it(name, fn) {
    try {
        await fn();
        passed++;
        console.log(`  ok   ${name}`);
    } catch (error) {
        failed++;
        failures.push({ name, error });
        console.log(`  FAIL ${name}`);
        console.log(`       ${error.message.split('\n')[0]}`);
    }
}

function describe(name) {
    console.log(`\n${name}`);
}

// --- fixtures ---------------------------------------------------------------

const AT = (h, m = 0) => new Date(2030, 5, 10, h, m).getTime(); // well into the future

const PEOPLE = {
    teacher: { uid: 't1', email: 'teacher.one@maristsj.co.za', name: 'Teacher One' },
    teacher2: { uid: 't2', email: 'teacher.two@maristsj.co.za', name: 'Teacher Two' },
    estate: { uid: 'em1', email: 'estate@maristsj.co.za', name: 'Estate Manager' },
    hoe: { uid: 'hoe1', email: 'hoe@maristsj.co.za', name: 'Head of Extramurals' },
    assetApprover: { uid: 'ap1', email: 'ap@maristsj.co.za', name: 'Asset Approver' },
    admin: { uid: 'adm1', email: 'admin@maristsj.co.za', name: 'Admin' },
    outsider: { uid: 'x1', email: 'random@gmail.com', name: 'Outsider' }
};

let testEnv;

const asPerson = (person) =>
    testEnv.authenticatedContext(person.uid, { email: person.email, email_verified: true }).database();

/** Mirrors bookingService.createBooking's write shape. */
function bookingWrite({ bookingId, assetId, assetName, start, end, person, status }) {
    const keys = slotKeysForRange(start, end);
    const booking = {
        assetId,
        assetName,
        start,
        end,
        startISO: new Date(start).toISOString(),
        endISO: new Date(end).toISOString(),
        reason: 'Test booking',
        requester: { uid: person.uid, email: person.email, name: person.name },
        requesterUid: person.uid,
        status,
        approvalMode: status === 'confirmed' ? 'auto' : 'signoff',
        slots: keys.reduce((acc, k) => ({ ...acc, [k]: true }), {}),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
    };

    const updates = { [`bookings/${bookingId}`]: booking };
    keys.forEach((k) => { updates[`bookingSlots/${assetId}/${k}`] = bookingId; });
    return { booking, updates, keys };
}

async function seed() {
    await testEnv.clearDatabase();
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
        const db = ctx.database();
        await set(ref(db, 'assets/room1'), {
            name: 'Meeting Room 1', type: 'room', approvalMode: 'auto', status: 'active'
        });
        await set(ref(db, 'assets/van1'), {
            name: 'Minibus 1', type: 'vehicle', approvalMode: 'signoff', status: 'active',
            approvers: { ap1: true }
        });
        await set(ref(db, 'admins/adm1'), { role: 'admin', email: PEOPLE.admin.email });
        await set(ref(db, 'bookingApprovers'), { em1: true, hoe1: true });
    });
}

// --- tests ------------------------------------------------------------------

async function run() {
    testEnv = await initializeTestEnvironment({
        projectId: PROJECT_ID,
        database: { rules, host: '127.0.0.1', port: 9000 }
    });

    describe('Domain gate');
    await seed();
    await it('a non-school Google account cannot read bookings', async () => {
        await assertFails(get(ref(asPerson(PEOPLE.outsider), 'bookings')));
    });
    await it('a non-school account cannot read tickets either', async () => {
        await assertFails(get(ref(asPerson(PEOPLE.outsider), 'tickets')));
    });
    await it('a school account can read bookings', async () => {
        await assertSucceeds(get(ref(asPerson(PEOPLE.teacher), 'bookings')));
    });

    describe('Creating bookings');
    await seed();
    await it('teacher books an auto-approve room as confirmed', async () => {
        const { updates } = bookingWrite({
            bookingId: 'b1', assetId: 'room1', assetName: 'Meeting Room 1',
            start: AT(9), end: AT(10), person: PEOPLE.teacher, status: 'confirmed'
        });
        await assertSucceeds(update(ref(asPerson(PEOPLE.teacher)), updates));
    });

    await seed();
    await it('teacher CANNOT self-confirm a sign-off vehicle', async () => {
        const { updates } = bookingWrite({
            bookingId: 'b2', assetId: 'van1', assetName: 'Minibus 1',
            start: AT(9), end: AT(10), person: PEOPLE.teacher, status: 'confirmed'
        });
        await assertFails(update(ref(asPerson(PEOPLE.teacher)), updates));
    });

    await seed();
    await it('teacher requests a sign-off vehicle as pending', async () => {
        const { updates } = bookingWrite({
            bookingId: 'b3', assetId: 'van1', assetName: 'Minibus 1',
            start: AT(9), end: AT(10), person: PEOPLE.teacher, status: 'pending'
        });
        await assertSucceeds(update(ref(asPerson(PEOPLE.teacher)), updates));
    });

    await seed();
    await it('teacher cannot book in someone else\'s name', async () => {
        const { updates } = bookingWrite({
            bookingId: 'b4', assetId: 'room1', assetName: 'Meeting Room 1',
            start: AT(9), end: AT(10), person: PEOPLE.teacher2, status: 'confirmed'
        });
        await assertFails(update(ref(asPerson(PEOPLE.teacher)), updates));
    });

    describe('Double-booking is impossible');
    await seed();
    await it('an overlapping booking is rejected', async () => {
        const first = bookingWrite({
            bookingId: 'c1', assetId: 'room1', assetName: 'Meeting Room 1',
            start: AT(9), end: AT(10), person: PEOPLE.teacher, status: 'confirmed'
        });
        await assertSucceeds(update(ref(asPerson(PEOPLE.teacher)), first.updates));

        const clash = bookingWrite({
            bookingId: 'c2', assetId: 'room1', assetName: 'Meeting Room 1',
            start: AT(9, 30), end: AT(10, 30), person: PEOPLE.teacher2, status: 'confirmed'
        });
        await assertFails(update(ref(asPerson(PEOPLE.teacher2)), clash.updates));
    });

    await seed();
    await it('a back-to-back booking is allowed', async () => {
        const first = bookingWrite({
            bookingId: 'd1', assetId: 'room1', assetName: 'Meeting Room 1',
            start: AT(9), end: AT(10), person: PEOPLE.teacher, status: 'confirmed'
        });
        await assertSucceeds(update(ref(asPerson(PEOPLE.teacher)), first.updates));

        const after = bookingWrite({
            bookingId: 'd2', assetId: 'room1', assetName: 'Meeting Room 1',
            start: AT(10), end: AT(11), person: PEOPLE.teacher2, status: 'confirmed'
        });
        await assertSucceeds(update(ref(asPerson(PEOPLE.teacher2)), after.updates));
    });

    await seed();
    await it('a pending request blocks the slot too', async () => {
        const pending = bookingWrite({
            bookingId: 'e1', assetId: 'van1', assetName: 'Minibus 1',
            start: AT(9), end: AT(10), person: PEOPLE.teacher, status: 'pending'
        });
        await assertSucceeds(update(ref(asPerson(PEOPLE.teacher)), pending.updates));

        const clash = bookingWrite({
            bookingId: 'e2', assetId: 'van1', assetName: 'Minibus 1',
            start: AT(9), end: AT(10), person: PEOPLE.teacher2, status: 'pending'
        });
        await assertFails(update(ref(asPerson(PEOPLE.teacher2)), clash.updates));
    });

    await seed();
    await it('two simultaneous requests for the same slot: exactly one wins', async () => {
        const a = bookingWrite({
            bookingId: 'r1', assetId: 'room1', assetName: 'Meeting Room 1',
            start: AT(11), end: AT(12), person: PEOPLE.teacher, status: 'confirmed'
        });
        const b = bookingWrite({
            bookingId: 'r2', assetId: 'room1', assetName: 'Meeting Room 1',
            start: AT(11), end: AT(12), person: PEOPLE.teacher2, status: 'confirmed'
        });

        // Fired without awaiting in between - the real race.
        const results = await Promise.allSettled([
            update(ref(asPerson(PEOPLE.teacher)), a.updates),
            update(ref(asPerson(PEOPLE.teacher2)), b.updates)
        ]);

        const wins = results.filter((r) => r.status === 'fulfilled').length;
        if (wins !== 1) {
            throw new Error(`expected exactly 1 winner, got ${wins}`);
        }
    });

    describe('Approval');
    const seedPending = async () => {
        await seed();
        const { updates } = bookingWrite({
            bookingId: 'p1', assetId: 'van1', assetName: 'Minibus 1',
            start: AT(9), end: AT(10), person: PEOPLE.teacher, status: 'pending'
        });
        await update(ref(asPerson(PEOPLE.teacher)), updates);
    };
    const approveAs = (person) =>
        update(ref(asPerson(person), 'bookings/p1'), {
            status: 'confirmed',
            updatedAt: new Date().toISOString(),
            decision: { action: 'approved', by: person.uid, byEmail: person.email, at: new Date().toISOString() }
        });

    await seedPending();
    await it('requester cannot approve their own pending booking', async () => {
        await assertFails(approveAs(PEOPLE.teacher));
    });

    await seedPending();
    await it('an unrelated teacher cannot approve it', async () => {
        await assertFails(approveAs(PEOPLE.teacher2));
    });

    await seedPending();
    await it('the Estate Manager (global approver) can approve', async () => {
        await assertSucceeds(approveAs(PEOPLE.estate));
    });

    await seedPending();
    await it('a Head of Extramurals can approve - blanket override', async () => {
        await assertSucceeds(approveAs(PEOPLE.hoe));
    });

    await seedPending();
    await it('an approver named on the asset can approve', async () => {
        await assertSucceeds(approveAs(PEOPLE.assetApprover));
    });

    await seedPending();
    await it('an admin can approve', async () => {
        await assertSucceeds(approveAs(PEOPLE.admin));
    });

    describe('Releasing time');
    await seedPending();
    await it('declining frees the slots for someone else', async () => {
        const keys = slotKeysForRange(AT(9), AT(10));
        const decline = {
            'bookings/p1/status': 'declined',
            'bookings/p1/updatedAt': new Date().toISOString()
        };
        keys.forEach((k) => { decline[`bookingSlots/van1/${k}`] = null; });
        await assertSucceeds(update(ref(asPerson(PEOPLE.estate)), decline));

        const retry = bookingWrite({
            bookingId: 'p2', assetId: 'van1', assetName: 'Minibus 1',
            start: AT(9), end: AT(10), person: PEOPLE.teacher2, status: 'pending'
        });
        await assertSucceeds(update(ref(asPerson(PEOPLE.teacher2)), retry.updates));
    });

    await seedPending();
    await it('the requester can cancel their own booking', async () => {
        const keys = slotKeysForRange(AT(9), AT(10));
        const cancel = {
            'bookings/p1/status': 'cancelled',
            'bookings/p1/updatedAt': new Date().toISOString()
        };
        keys.forEach((k) => { cancel[`bookingSlots/van1/${k}`] = null; });
        await assertSucceeds(update(ref(asPerson(PEOPLE.teacher)), cancel));
    });

    await seedPending();
    await it('a stranger cannot cancel someone else\'s booking', async () => {
        const keys = slotKeysForRange(AT(9), AT(10));
        const cancel = {
            'bookings/p1/status': 'cancelled',
            'bookings/p1/updatedAt': new Date().toISOString()
        };
        keys.forEach((k) => { cancel[`bookingSlots/van1/${k}`] = null; });
        await assertFails(update(ref(asPerson(PEOPLE.teacher2)), cancel));
    });

    describe('Assets');
    await seed();
    await it('a teacher cannot create an asset', async () => {
        await assertFails(set(ref(asPerson(PEOPLE.teacher), 'assets/sneaky'), {
            name: 'Mine', type: 'room', approvalMode: 'auto', status: 'active'
        }));
    });
    await it('an admin can create an asset', async () => {
        await assertSucceeds(set(ref(asPerson(PEOPLE.admin), 'assets/hall'), {
            name: 'Hall', type: 'room', approvalMode: 'signoff', status: 'active'
        }));
    });
    await it('an asset with an invalid type is rejected', async () => {
        await assertFails(set(ref(asPerson(PEOPLE.admin), 'assets/weird'), {
            name: 'Weird', type: 'spaceship', approvalMode: 'auto', status: 'active'
        }));
    });
    await it('a teacher cannot make themselves a global approver', async () => {
        await assertFails(set(ref(asPerson(PEOPLE.teacher), 'bookingApprovers/t1'), true));
    });

    describe('User directory');
    await seed();
    await it('a user can register themselves', async () => {
        await assertSucceeds(set(ref(asPerson(PEOPLE.teacher), 'users/t1'), {
            email: PEOPLE.teacher.email, name: PEOPLE.teacher.name
        }));
    });
    await it('a user cannot write someone else\'s directory entry', async () => {
        await assertFails(set(ref(asPerson(PEOPLE.teacher), 'users/t2'), {
            email: PEOPLE.teacher2.email, name: 'Impostor'
        }));
    });
    await it('a user cannot claim a different email', async () => {
        await assertFails(set(ref(asPerson(PEOPLE.teacher), 'users/t1'), {
            email: 'someone.else@maristsj.co.za', name: 'Nope'
        }));
    });

    await testEnv.cleanup();

    console.log(`\n${passed} passed, ${failed} failed\n`);
    if (failed) {
        failures.forEach(({ name, error }) => {
            console.log(`--- ${name}\n${error.stack}\n`);
        });
        process.exit(1);
    }
}

run().catch((error) => {
    console.error('\nTest run crashed:', error);
    process.exit(1);
});
