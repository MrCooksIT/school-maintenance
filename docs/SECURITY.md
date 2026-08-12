# Security Remediation - June 2026

Two critical issues were found during a platform review on 2026-06-12.
Issue 1 requires a manual action in Google Cloud Console **as soon as
possible**. Issue 2 is fixed by deploying `database.rules.json` in the
order described below.

---

## Issue 1 - CRITICAL: Firebase admin private key is public

The file `AppsScripts/Firebase.gs` (deleted from the working tree, but still
in git history of this **public** repo) contains the full private key for
the service account:

```
firebase-adminsdk-fbsvc@sjmc-maintenance-system.iam.gserviceaccount.com
key id: da3759b524ddafbaba9347581034639afd23d5a5
```

Anyone can download it today from the raw GitHub URL of commit `58a89d4`.
This key grants **full admin access to the entire Firebase project and
bypasses all security rules**, so the rules below are meaningless until it
is revoked.

### Fix (do this first)

1. Go to https://console.cloud.google.com/iam-admin/serviceaccounts
   (project `sjmc-maintenance-system`)
   -> `firebase-adminsdk-fbsvc@...` -> **Keys** -> delete key
   `da3759b5...`.
   Or with gcloud:
   ```
   gcloud iam service-accounts keys delete da3759b524ddafbaba9347581034639afd23d5a5 \
     --iam-account=firebase-adminsdk-fbsvc@sjmc-maintenance-system.iam.gserviceaccount.com \
     --project=sjmc-maintenance-system
   ```
2. Create a **new** key (same page -> Add key -> JSON). Do NOT commit it
   anywhere.
3. In the live Apps Script project (the email->ticket script):
   - Project Settings -> Script Properties -> add property
     `SERVICE_ACCOUNT` with the new key JSON as the value.
   - Replace the hardcoded JSON in `getServiceAccountCredentials()` with:
     ```js
     function getServiceAccountCredentials() {
       return JSON.parse(
         PropertiesService.getScriptProperties().getProperty('SERVICE_ACCOUNT')
       );
     }
     ```
   - Add the auth header to EVERY `UrlFetchApp.fetch` call that hits
     `firebaseio.com` (createTicket's POST, the GET polls in
     notification.gs, the DELETE in cleanupDuplicateTickets - currently
     only updateTicket sends it):
     ```js
     headers: { Authorization: 'Bearer ' + getAccessToken() }
     ```
4. Consider making this repo **private** (GitHub repo Settings ->
   Danger Zone). Note: GitHub Pages on the free plan requires a public
   repo - if it must stay public, the revocation in step 1 is what makes
   the leaked key harmless. The key remains visible in history either way;
   revocation is the real fix.

## Issue 2 - CRITICAL: database was world-readable and world-writable

Verified on 2026-06-12: anonymous `GET`/`PUT` to
`https://sjmc-maintenance-system-default-rtdb.firebaseio.com/.json`
succeeded - all tickets, staff phone numbers, requester emails and the
admins list were publicly readable, and anyone could modify or delete
anything (including granting themselves admin).

### Fix: `database.rules.json` (now version-controlled)

| Path | Read | Write |
|------|------|-------|
| `tickets` | logged-in users | logged-in users; anonymous may only **create** (public form), validated |
| `staff` | logged-in users | admins only (protects WhatsApp numbers) |
| `admins` | own entry; full list for `role: admin` | `role: admin` only |
| `categories`, `locations` | public (the public form loads them) | admins only |
| `notifications`, `ticketCounter` | logged-in users | logged-in users |
| everything else | denied | denied |

The Apps Script authenticates as the admin service account, so it bypasses
rules and keeps full access for email->ticket creation and status patches.

### Deploy order (matters!)

1. Complete Issue 1 steps first - once rules deploy, the Apps Script's
   unauthenticated GET/POST calls will be blocked, so it must already be
   sending the Bearer token.
2. Deploy the rules:
   ```
   firebase deploy --only database
   ```
   (`.firebaserc` now points at `sjmc-maintenance-system` - it previously
   pointed at `campuscare-9b9d2`, a different project with no database,
   which would have silently deployed rules and functions to the wrong
   place.)
3. Verify:
   - Anonymous read is blocked:
     `curl https://sjmc-maintenance-system-default-rtdb.firebaseio.com/staff.json`
     must return `Permission denied`.
   - Public form still submits (it creates new tickets anonymously - allowed).
   - Email->ticket still works (send a test email).
   - Dashboard, assignment, Team page still work when logged in.
   - A logged-in non-admin cannot open #/admin/roles data.

## Issue 3 - HIGH: no backups

The database has no backup configuration. Enable automated backups:
Firebase Console -> Realtime Database -> Backups tab (requires Blaze plan,
which is also needed for Cloud Functions / the WhatsApp feature).
Cost at this data size is negligible.

## Housekeeping notes

- `admins` contains a stale entry keyed by a push id
  (`-OPj1I-_n9TaRQ_E13eA`, duplicate of Riaan's real uid-keyed entry).
  Harmless under the new rules (it can never match an auth uid) but worth
  deleting for clarity.
- The Firestore rules (`firestore.rules`) already deny everything;
  Firestore is unused (the Firestore-triggered functions in
  `functions/index.js` are dead code - tickets live in RTDB).
- Firebase Storage is not provisioned for this project (verified: default
  bucket 404s). If it is ever enabled for file attachments, add a
  `storage.rules` file requiring auth before first use.
