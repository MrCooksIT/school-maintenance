// tests/seedEmulator.mjs
//
// Fills the local emulator with realistic assets and bookings so the UI can be
// clicked through without touching production. Never talks to a real project -
// the "demo-" namespace only exists in the emulator.
//
//   node tests/seedEmulator.mjs
//   node tests/seedEmulator.mjs --promote <uid>   make that uid admin + approver

const NS = 'demo-sjmc-bookings';
const BASE = `http://127.0.0.1:9000`;

// The emulator accepts "owner" as an admin bearer token, so seeding bypasses rules.
async function write(path, data) {
    const res = await fetch(`${BASE}/${path}.json?ns=${NS}`, {
        method: 'PUT',
        headers: { Authorization: 'Bearer owner', 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
    });
    if (!res.ok) throw new Error(`${path}: ${res.status} ${await res.text()}`);
}

async function read(path) {
    const res = await fetch(`${BASE}/${path}.json?ns=${NS}`, {
        headers: { Authorization: 'Bearer owner' }
    });
    if (!res.ok) throw new Error(`${path}: ${res.status}`);
    return res.json();
}

const SLOT_MINUTES = 15;
const pad = (n) => String(n).padStart(2, '0');
const slotKey = (d) =>
    `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}-${pad(d.getHours())}${pad(d.getMinutes())}`;

function slotsFor(start, end) {
    const keys = [];
    const cursor = new Date(start);
    while (cursor < new Date(end)) {
        keys.push(slotKey(cursor));
        cursor.setMinutes(cursor.getMinutes() + SLOT_MINUTES);
    }
    return keys;
}

const today = new Date();
const at = (h, m = 0, dayOffset = 0) => {
    const d = new Date(today);
    d.setDate(d.getDate() + dayOffset);
    d.setHours(h, m, 0, 0);
    return d.getTime();
};

const PEOPLE = {
    dlombard: { uid: 'seed-dlombard', email: 'dlombard@maristsj.co.za', name: 'D Lombard' },
    pnaidoo: { uid: 'seed-pnaidoo', email: 'pnaidoo@maristsj.co.za', name: 'P Naidoo' },
    estate: { uid: 'seed-estate', email: 'estate@maristsj.co.za', name: 'Estate Manager' },
    hoe1: { uid: 'seed-hoe1', email: 'hoe1@maristsj.co.za', name: 'K Mbeki (Extramurals)' },
    hoe2: { uid: 'seed-hoe2', email: 'hoe2@maristsj.co.za', name: 'S Fourie (Extramurals)' }
};

const ASSETS = {
    'asset-hall': {
        name: 'School Hall', type: 'room', approvalMode: 'signoff', status: 'active',
        capacity: '400 seats', description: 'Main hall. Check the fixture list before booking.',
        hours: { dayStart: '07:00', dayEnd: '17:00' }
    },
    'asset-boardroom': {
        name: 'Boardroom', type: 'room', approvalMode: 'auto', status: 'active',
        capacity: '12 seats', description: 'Projector and whiteboard.',
        hours: { dayStart: '07:00', dayEnd: '17:00' }
    },
    'asset-minibus1': {
        name: 'Minibus 1', type: 'vehicle', approvalMode: 'signoff', status: 'active',
        capacity: '22 seats', description: 'Licensed driver required.',
        hours: { dayStart: '06:00', dayEnd: '18:00' }
    },
    'asset-trolleyA': {
        name: 'Laptop Trolley A', type: 'equipment', approvalMode: 'auto', status: 'active',
        capacity: '30 laptops', description: 'Charge overnight before returning.',
        hours: { dayStart: '07:00', dayEnd: '17:00' }
    },
    'asset-camera': {
        name: 'Canon DSLR Kit', type: 'equipment', approvalMode: 'signoff', status: 'active',
        capacity: '1 body, 2 lenses', description: 'Sign out at reception.',
        hours: { dayStart: '07:00', dayEnd: '17:00' }
    }
};

function booking({ id, assetId, person, start, end, reason, status }) {
    return {
        id,
        record: {
            assetId,
            assetName: ASSETS[assetId].name,
            assetType: ASSETS[assetId].type,
            start, end,
            startISO: new Date(start).toISOString(),
            endISO: new Date(end).toISOString(),
            reason,
            requester: { uid: person.uid, email: person.email, name: person.name },
            requesterUid: person.uid,
            status,
            approvalMode: ASSETS[assetId].approvalMode,
            slots: slotsFor(start, end).reduce((a, k) => ({ ...a, [k]: true }), {}),
            createdAt: new Date(Date.now() - 86400000).toISOString(),
            updatedAt: new Date(Date.now() - 86400000).toISOString()
        }
    };
}

const BOOKINGS = [
    booking({
        id: 'bk-1', assetId: 'asset-boardroom', person: PEOPLE.dlombard,
        start: at(9), end: at(10), reason: 'Grade head meeting', status: 'confirmed'
    }),
    booking({
        id: 'bk-2', assetId: 'asset-boardroom', person: PEOPLE.pnaidoo,
        start: at(13), end: at(14, 30), reason: 'Parent interview', status: 'confirmed'
    }),
    booking({
        id: 'bk-3', assetId: 'asset-hall', person: PEOPLE.pnaidoo,
        start: at(11), end: at(13), reason: 'Grade 9 assembly rehearsal', status: 'pending'
    }),
    booking({
        id: 'bk-4', assetId: 'asset-minibus1', person: PEOPLE.dlombard,
        start: at(7, 30, 1), end: at(16, 0, 1), reason: 'U15 hockey away fixture', status: 'pending'
    }),
    booking({
        id: 'bk-5', assetId: 'asset-trolleyA', person: PEOPLE.dlombard,
        start: at(8), end: at(9, 30), reason: 'Grade 8 coding practical', status: 'confirmed'
    })
];

async function main() {
    const promoteIndex = process.argv.indexOf('--promote');

    if (promoteIndex !== -1) {
        const uid = process.argv[promoteIndex + 1];
        if (!uid) throw new Error('--promote needs a uid');
        await write(`admins/${uid}`, { role: 'admin', email: 'signed-in-tester', name: 'Tester' });
        await write(`bookingApprovers/${uid}`, true);
        console.log(`Promoted ${uid} to admin + global approver.`);
        return;
    }

    console.log('Seeding emulator...');

    for (const [uid, person] of Object.entries(PEOPLE)) {
        await write(`users/${person.uid}`, {
            email: person.email, name: person.name, lastSeen: new Date().toISOString()
        });
        void uid;
    }

    await write('bookingApprovers', {
        [PEOPLE.estate.uid]: true,
        [PEOPLE.hoe1.uid]: true,
        [PEOPLE.hoe2.uid]: true
    });

    for (const [id, asset] of Object.entries(ASSETS)) {
        await write(`assets/${id}`, { ...asset, createdAt: new Date().toISOString() });
    }

    const slotIndex = {};
    for (const { id, record } of BOOKINGS) {
        await write(`bookings/${id}`, record);
        slotIndex[record.assetId] = slotIndex[record.assetId] || {};
        Object.keys(record.slots).forEach((k) => { slotIndex[record.assetId][k] = id; });
    }
    for (const [assetId, slots] of Object.entries(slotIndex)) {
        await write(`bookingSlots/${assetId}`, slots);
    }

    const check = await read('assets');
    console.log(`Seeded ${Object.keys(check).length} assets and ${BOOKINGS.length} bookings.`);
    console.log('Global approvers: Estate Manager + 2 Heads of Extramurals.');
}

main().catch((error) => {
    console.error(error.message);
    process.exit(1);
});
