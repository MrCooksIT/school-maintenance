// tests/auditRoles.mjs
//
// READ-ONLY audit of who has what access in production.
//
// Answers three questions the codebase cannot:
//   1. Which admins/ and staff/ records are keyed by a real Firebase uid, and
//      which are stale push ids that can never match auth.uid?
//   2. Who is an admin vs a supervisor?
//   3. Who would lose or keep access under the tightened rules?
//
// Uses `firebase database:get`, so it runs with your CLI credentials and makes
// no writes whatsoever.
//
//   node tests/auditRoles.mjs
//   node tests/auditRoles.mjs --project sjmc-maintenance-system

import { execFileSync } from 'node:child_process';

const projectFlag = process.argv.indexOf('--project');
const PROJECT = projectFlag !== -1 ? process.argv[projectFlag + 1] : 'sjmc-maintenance-system';

// A Firebase uid is 28 url-safe chars; a push id starts with "-" and is 20 chars.
const isFirebaseUid = (key) => /^[A-Za-z0-9]{28}$/.test(key);
const isPushId = (key) => /^-[A-Za-z0-9_-]{19}$/.test(key);

function fetchNode(path) {
    try {
        const raw = execFileSync(
            'firebase',
            ['database:get', path, '--project', PROJECT],
            { encoding: 'utf8', maxBuffer: 32 * 1024 * 1024, shell: true }
        );
        return JSON.parse(raw);
    } catch (error) {
        console.error(`Could not read ${path}: ${error.message.split('\n')[0]}`);
        return null;
    }
}

function keyKind(key) {
    if (isFirebaseUid(key)) return 'uid';
    if (isPushId(key)) return 'push-id';
    return 'other';
}

function table(rows, headers) {
    const widths = headers.map((h, i) =>
        Math.max(h.length, ...rows.map((r) => String(r[i] ?? '').length))
    );
    const line = (cells) => '  ' + cells.map((c, i) => String(c ?? '').padEnd(widths[i])).join('  ');
    console.log(line(headers));
    console.log('  ' + widths.map((w) => '-'.repeat(w)).join('  '));
    rows.forEach((r) => console.log(line(r)));
}

console.log(`\nAuditing project: ${PROJECT}  (read-only)\n`);

const admins = fetchNode('/admins') || {};
const staff = fetchNode('/staff') || {};
const maintenanceStaff = fetchNode('/maintenanceStaff') || {};
const users = fetchNode('/users') || {};

// --- admins ---------------------------------------------------------------
console.log('ADMINS');
const adminRows = Object.entries(admins).map(([key, value]) => [
    key,
    keyKind(key),
    value?.role ?? '(none)',
    value?.email ?? '',
    value?.name ?? ''
]);
if (adminRows.length) table(adminRows, ['key', 'key type', 'role', 'email', 'name']);
else console.log('  (empty)');

const deadAdmins = adminRows.filter((r) => r[1] !== 'uid');
const supervisors = adminRows.filter((r) => r[2] === 'supervisor');

// --- staff ----------------------------------------------------------------
console.log('\nSTAFF');
const staffRows = Object.entries(staff).map(([key, value]) => [
    key,
    keyKind(key),
    value?.role ?? '(none)',
    value?.email ?? '',
    value?.name ?? ''
]);
if (staffRows.length) table(staffRows, ['key', 'key type', 'role', 'email', 'name']);
else console.log('  (empty)');

// --- maintenance access ---------------------------------------------------
console.log('\nMAINTENANCE PORTAL ACCESS (maintenanceStaff)');
const mRows = Object.entries(maintenanceStaff)
    .filter(([, v]) => v)
    .map(([key]) => [key, keyKind(key), users?.[key]?.email ?? '(has not signed in)']);
if (mRows.length) table(mRows, ['uid', 'key type', 'email']);
else console.log('  (empty - nobody granted yet)');

// --- findings -------------------------------------------------------------
console.log('\n--- FINDINGS ---\n');

if (deadAdmins.length) {
    console.log(`${deadAdmins.length} admins/ record(s) are NOT keyed by a Firebase uid.`);
    console.log('These can never match auth.uid, so they grant nothing and are safe to delete:');
    deadAdmins.forEach((r) => console.log(`  - admins/${r[0]}   ${r[3] || r[4] || ''}`));
    console.log('');
}

if (supervisors.length) {
    console.log(`${supervisors.length} supervisor(s) found. Today they can edit locations,`);
    console.log('categories and team. After the tightened rules they keep ticket access but');
    console.log('lose system configuration - which is the intended "limited" tier:');
    supervisors.forEach((r) => console.log(`  - ${r[3] || r[0]}  (${r[1]})`));
    console.log('');
}

const staffNotUid = staffRows.filter((r) => r[1] !== 'uid');
if (staffNotUid.length) {
    console.log(`${staffNotUid.length} of ${staffRows.length} staff/ record(s) are push-id keyed, so they cannot`);
    console.log('be matched by security rules. Anyone here who needs the maintenance portal must');
    console.log('sign in once, then be ticked under Admin -> Portal access.\n');
}

const realAdmins = adminRows.filter((r) => r[1] === 'uid' && r[2] === 'admin');
console.log(`${realAdmins.length} genuine admin(s) will retain full access:`);
realAdmins.forEach((r) => console.log(`  - ${r[3] || r[0]}`));
console.log('');
