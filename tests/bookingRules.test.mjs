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

    describe('Maintenance portal isolation');
    await seed();
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
        const db = ctx.database();
        await set(ref(db, 'tickets/t-existing'), {
            title: 'Broken projector', description: 'Room 12', status: 'pending',
            reportedBy: 'Someone', reporterEmail: 'someone@maristsj.co.za'
        });
        await set(ref(db, 'staff/-NpushId'), { name: 'Groundsman', email: 'grounds@maristsj.co.za' });
        await set(ref(db, 'maintenanceStaff/mt1'), true);
    });
    const maintenanceTech = { uid: 'mt1', email: 'tech@maristsj.co.za', name: 'Maintenance Tech' };

    await it('an ordinary teacher CANNOT read tickets', async () => {
        await assertFails(get(ref(asPerson(PEOPLE.teacher), 'tickets')));
    });
    await it('an ordinary teacher cannot read a single ticket either', async () => {
        await assertFails(get(ref(asPerson(PEOPLE.teacher), 'tickets/t-existing')));
    });
    await it('an ordinary teacher cannot read the staff list', async () => {
        await assertFails(get(ref(asPerson(PEOPLE.teacher), 'staff')));
    });
    await it('a granted maintenance user CAN read tickets', async () => {
        await assertSucceeds(get(ref(asPerson(maintenanceTech), 'tickets')));
    });
    await it('an admin can still read tickets', async () => {
        await assertSucceeds(get(ref(asPerson(PEOPLE.admin), 'tickets')));
    });
    await it('a teacher can still book - isolation did not break bookings', async () => {
        const { updates } = bookingWrite({
            bookingId: 'iso1', assetId: 'room1', assetName: 'Meeting Room 1',
            start: AT(14), end: AT(15), person: PEOPLE.teacher, status: 'confirmed'
        });
        await assertSucceeds(update(ref(asPerson(PEOPLE.teacher)), updates));
    });
    await it('a teacher cannot grant themselves maintenance access', async () => {
        await assertFails(set(ref(asPerson(PEOPLE.teacher), 'maintenanceStaff/t1'), true));
    });
    await it('an admin can grant maintenance access', async () => {
        await assertSucceeds(set(ref(asPerson(PEOPLE.admin), 'maintenanceStaff/t2'), true));
    });
    await it('a teacher can check their own access flag', async () => {
        await assertSucceeds(get(ref(asPerson(PEOPLE.teacher), 'maintenanceStaff/t1')));
    });
    await it('an ordinary teacher cannot edit or reassign a ticket', async () => {
        await assertFails(update(ref(asPerson(PEOPLE.teacher), 'tickets/t-existing'), {
            status: 'completed', assignedTo: 'whoever'
        }));
    });
    await it('a limited estate staffer CAN assign and edit a ticket', async () => {
        await assertSucceeds(update(ref(asPerson(maintenanceTech), 'tickets/t-existing'), {
            status: 'in-progress', assignedTo: '-NpushId'
        }));
    });
    await it('a signed-in teacher can still report a new fault', async () => {
        await assertSucceeds(set(ref(asPerson(PEOPLE.teacher), 'tickets/t-from-teacher'), {
            title: 'Blocked drain', description: 'Quad', status: 'pending',
            reportedBy: PEOPLE.teacher.name, reporterEmail: PEOPLE.teacher.email
        }));
    });
    await it('a limited estate staffer cannot edit locations or categories', async () => {
        await assertFails(set(ref(asPerson(maintenanceTech), 'locations/newplace'), { name: 'Nope' }));
        await assertFails(set(ref(asPerson(maintenanceTech), 'categories/newcat'), { name: 'Nope' }));
    });
    await it('a limited estate staffer cannot edit the team or grant access', async () => {
        await assertFails(set(ref(asPerson(maintenanceTech), 'staff/-NnewGuy'), { name: 'Nope' }));
        await assertFails(set(ref(asPerson(maintenanceTech), 'maintenanceStaff/t1'), true));
    });
    await it('a limited estate staffer cannot create bookable assets', async () => {
        await assertFails(set(ref(asPerson(maintenanceTech), 'assets/nope'), {
            name: 'Nope', type: 'room', approvalMode: 'auto', status: 'active'
        }));
    });
    // The Gmail Apps Script posts to /tickets.json with no auth token, and its
    // payload shape differs from the web form's. Both must be accepted, or
    // emailed faults are silently dropped.
    await it('the email parser can create a ticket unauthenticated', async () => {
        const anon = testEnv.unauthenticatedContext().database();
        await assertSucceeds(set(ref(anon, 'tickets/t-email'), {
            subject: 'Birds in the ceiling above support office',
            description: 'The birds have taken a liking to the ceiling.',
            requester: { email: 'j.wright@maristsj.co.za', name: 'Jemma Wright' },
            status: 'new',
            category: 'structural',
            location: 'Office',
            priority: 'low',
            createdAt: new Date().toISOString(),
            ticketId: 'SJMC-571239-468',
            hasAttachments: false
        }));
    });
    await it('an emailed ticket from outside the school is rejected', async () => {
        const anon = testEnv.unauthenticatedContext().database();
        await assertFails(set(ref(anon, 'tickets/t-outsider'), {
            subject: 'Spam', description: 'Spam',
            requester: { email: 'spammer@example.com', name: 'Spammer' },
            status: 'new'
        }));
    });
    await it('an anonymous ticket cannot be created already completed', async () => {
        const anon = testEnv.unauthenticatedContext().database();
        await assertFails(set(ref(anon, 'tickets/t-sneaky'), {
            subject: 'Sneaky', description: 'Sneaky',
            requester: { email: 'teacher.one@maristsj.co.za', name: 'T' },
            status: 'completed'
        }));
    });
    await it('the public ticket form can still submit unauthenticated', async () => {
        const anon = testEnv.unauthenticatedContext().database();
        await assertSucceeds(set(ref(anon, 'tickets/t-public'), {
            title: 'Leaking tap', description: 'Staff room', status: 'pending',
            reportedBy: 'A Teacher', reporterEmail: 'teacher.one@maristsj.co.za'
        }));
    });

    describe('Editing booking details');
    await seedPending();
    await it('the requester can edit their own reason', async () => {
        await assertSucceeds(update(ref(asPerson(PEOPLE.teacher), 'bookings/p1'), {
            reason: 'Corrected: U15 hockey, not U14',
            updatedAt: new Date().toISOString()
        }));
    });
    await it('the requester CANNOT move their own booking in time', async () => {
        await assertFails(update(ref(asPerson(PEOPLE.teacher), 'bookings/p1'), {
            start: AT(14), end: AT(15), updatedAt: new Date().toISOString()
        }));
    });
    await it('the requester cannot switch their booking to another asset', async () => {
        await assertFails(update(ref(asPerson(PEOPLE.teacher), 'bookings/p1'), {
            assetId: 'room1', updatedAt: new Date().toISOString()
        }));
    });
    await it('an unrelated teacher cannot edit the reason', async () => {
        await assertFails(update(ref(asPerson(PEOPLE.teacher2), 'bookings/p1'), {
            reason: 'Hijacked', updatedAt: new Date().toISOString()
        }));
    });
    await it('an approver can still move it in time', async () => {
        await assertSucceeds(update(ref(asPerson(PEOPLE.estate), 'bookings/p1'), {
            start: AT(14), end: AT(15), updatedAt: new Date().toISOString()
        }));
    });

    describe('Notification inboxes');
    await seed();
    await it('you can read your own inbox', async () => {
        await assertSucceeds(get(ref(asPerson(PEOPLE.estate), 'bookingNotifications/em1')));
    });
    await it('you cannot read someone else\'s inbox', async () => {
        await assertFails(get(ref(asPerson(PEOPLE.teacher), 'bookingNotifications/em1')));
    });
    await it('a requester can drop a notification into an approver\'s inbox', async () => {
        await assertSucceeds(set(ref(asPerson(PEOPLE.teacher), 'bookingNotifications/em1/n1'), {
            type: 'booking_pending', title: 'Booking needs sign-off',
            createdAt: new Date().toISOString(), read: false, emailSent: false
        }));
    });
    await it('a malformed notification is rejected', async () => {
        await assertFails(set(ref(asPerson(PEOPLE.teacher), 'bookingNotifications/em1/n2'), {
            nonsense: true
        }));
    });
    await it('an approver can mark their own notification read', async () => {
        await assertSucceeds(update(ref(asPerson(PEOPLE.estate), 'bookingNotifications/em1/n1'), {
            read: true, readAt: new Date().toISOString()
        }));
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
