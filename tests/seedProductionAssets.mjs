// tests/seedProductionAssets.mjs
//
// Adds a starter set of bookable assets to a real Firebase project, and repairs
// any asset whose bookable hours end at "00:00" (which used to render an empty
// calendar).
//
// Safe to run more than once: assets are matched by name, so an asset that
// already exists is skipped rather than duplicated. Nothing is ever deleted.
//
//   node tests/seedProductionAssets.mjs --dry-run     show what would change
//   node tests/seedProductionAssets.mjs               apply it

import { execFileSync } from 'node:child_process';
import { writeFileSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const args = process.argv.slice(2);
const DRY_RUN = args.includes('--dry-run');
const projectFlag = args.indexOf('--project');
const PROJECT = projectFlag !== -1 ? args[projectFlag + 1] : 'sjmc-maintenance-system';

const scratch = mkdtempSync(join(tmpdir(), 'sjmc-assets-'));

function cli(cmdArgs) {
    return execFileSync('firebase', cmdArgs, {
        encoding: 'utf8',
        maxBuffer: 32 * 1024 * 1024,
        shell: true
    });
}

function readNode(path) {
    try {
        return JSON.parse(cli(['database:get', path, '--project', PROJECT]));
    } catch (error) {
        console.error(`Could not read ${path}: ${error.message.split('\n')[0]}`);
        return null;
    }
}

function writeJsonFile(name, data) {
    const file = join(scratch, name);
    writeFileSync(file, JSON.stringify(data), 'utf8');
    return file;
}

function pushAsset(asset) {
    const file = writeJsonFile(`${asset.name.replace(/\W+/g, '_')}.json`, asset);
    cli(['database:push', '/assets', `"${file}"`, '--project', PROJECT]);
}

function patchHours(assetId, hours) {
    const file = writeJsonFile(`hours_${assetId}.json`, hours);
    cli(['database:update', `/assets/${assetId}/hours`, `"${file}"`, '--project', PROJECT, '--force']);
}

// Rooms and equipment run to the end of the school day; vehicles start early and
// run late for away fixtures.
const SCHOOL_HOURS = { dayStart: '07:00', dayEnd: '17:00' };
const LONG_HOURS = { dayStart: '05:00', dayEnd: '23:59' };

const DEMO_ASSETS = [
    {
        name: 'Boardroom', type: 'room', approvalMode: 'auto', status: 'active',
        capacity: '12 seats', description: 'Projector and whiteboard.', hours: SCHOOL_HOURS
    },
    {
        name: 'Media Centre', type: 'room', approvalMode: 'auto', status: 'active',
        capacity: '40 seats', description: 'Quiet space - please book rather than just arrive.',
        hours: SCHOOL_HOURS
    },
    {
        name: 'Computer Lab 1', type: 'room', approvalMode: 'signoff', status: 'active',
        capacity: '30 workstations', description: 'Timetabled for IT classes. Sign-off required.',
        hours: SCHOOL_HOURS
    },
    {
        name: 'Minibus 1', type: 'vehicle', approvalMode: 'signoff', status: 'active',
        capacity: '22 seats', description: 'Licensed driver required. Fuel card in the glovebox.',
        hours: LONG_HOURS
    },
    {
        name: 'Minibus 2', type: 'vehicle', approvalMode: 'signoff', status: 'active',
        capacity: '22 seats', description: 'Licensed driver required.', hours: LONG_HOURS
    },
    {
        name: 'Laptop Trolley A', type: 'equipment', approvalMode: 'auto', status: 'active',
        capacity: '30 laptops', description: 'Please return on charge.', hours: SCHOOL_HOURS
    },
    {
        name: 'Laptop Trolley B', type: 'equipment', approvalMode: 'auto', status: 'active',
        capacity: '30 laptops', description: 'Please return on charge.', hours: SCHOOL_HOURS
    },
    {
        name: 'Canon DSLR Kit', type: 'equipment', approvalMode: 'signoff', status: 'active',
        capacity: '1 body, 2 lenses', description: 'Sign out at reception.', hours: SCHOOL_HOURS
    },
    {
        name: 'Portable PA System', type: 'equipment', approvalMode: 'signoff', status: 'active',
        capacity: '2 speakers, 1 mic', description: 'Heavy - bring a trolley.', hours: SCHOOL_HOURS
    }
];

function main() {
    console.log(`\nProject: ${PROJECT}${DRY_RUN ? '   (DRY RUN - nothing will be written)' : ''}\n`);

    const existing = readNode('/assets') || {};
    const existingByName = new Map(
        Object.entries(existing).map(([id, a]) => [String(a?.name || '').toLowerCase(), { id, ...a }])
    );

    // 1. Repair assets whose day ends at midnight.
    const broken = Object.entries(existing).filter(([, a]) => a?.hours?.dayEnd === '00:00');
    if (broken.length) {
        console.log('Repairing bookable hours (dayEnd 00:00 renders an empty calendar):');
        for (const [id, asset] of broken) {
            console.log(`  ${asset.name}: ${asset.hours.dayStart}-00:00  ->  ${asset.hours.dayStart}-23:59`);
            if (!DRY_RUN) patchHours(id, { dayEnd: '23:59' });
        }
        console.log('');
    } else {
        console.log('No assets need their hours repaired.\n');
    }

    // 2. Add any demo asset that is not already there.
    const toAdd = DEMO_ASSETS.filter((a) => !existingByName.has(a.name.toLowerCase()));
    const skipped = DEMO_ASSETS.length - toAdd.length;

    if (toAdd.length) {
        console.log(`Adding ${toAdd.length} asset(s):`);
        for (const asset of toAdd) {
            const mode = asset.approvalMode === 'auto' ? 'auto-approve' : 'sign-off';
            console.log(`  ${asset.name.padEnd(20)} ${asset.type.padEnd(10)} ${mode}`);
            if (!DRY_RUN) pushAsset({ ...asset, createdAt: new Date().toISOString() });
        }
    } else {
        console.log('All demo assets already exist.');
    }
    if (skipped) console.log(`\n${skipped} already existed and were left alone.`);

    console.log(DRY_RUN ? '\nDry run complete - nothing was written.\n' : '\nDone.\n');
}

main();
