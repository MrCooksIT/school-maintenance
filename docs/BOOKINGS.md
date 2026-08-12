# Booking system

Rooms, vehicles and equipment, sharing the maintenance app's hosting, Firebase
project, login and look. Lives under `/#/bookings`.

## Why it cannot double-book

Every booking claims a set of fixed 15-minute slot keys under
`bookingSlots/{assetId}/{slotKey}`, written **in the same atomic multi-path
update** as the booking record itself. The security rule on a slot is
`!data.exists()` - you may only write a slot nobody holds.

If any single slot in the range is taken, Firebase rejects the **entire** update
and no booking is created. There is no check-then-write window for a second
teacher to slip through, and it needs no Cloud Functions - so it runs on the free
Spark plan.

A **pending** booking holds its slots exactly like a confirmed one, and shows on
the calendar as an amber hatched block. Declining or cancelling releases them in
the same atomic write that changes the status.

## Data

```
assets/{assetId}          name, type (room|vehicle|equipment), description,
                          capacity, approvalMode (auto|signoff), approvers{uid},
                          status (active|retired), hours{dayStart,dayEnd}
bookings/{bookingId}      assetId, assetName, start, end (epoch ms), reason,
                          requester{uid,email,name}, requesterUid, status
                          (pending|confirmed|declined|cancelled), decision{},
                          slots{}, createdAt, updatedAt
bookingSlots/{assetId}/{slotKey} = bookingId
bookingApprovers/{uid}    = true    global override approvers
users/{uid}               email, name, lastSeen - self-registered on sign-in
```

Assets are **retired, never deleted** - existing bookings still reference them.

Asset type-specific fields (a vehicle needing a licensed driver, say) can be
added to the asset document without a redesign; nothing reads assets by a fixed
schema.

### Why `users/{uid}` exists

`staff/` and `admins/` are keyed by **push id**, but the security rules match on
`auth.uid`. There was no way to look a person up by uid, so approvers could not
be assigned by name. `users/{uid}` is written by each person on sign-in and is
the list the approver pickers read from. People appear there once they have
logged in at least once.

## Approval

- `approvalMode: 'auto'` - confirmed instantly if free. A calendar hold.
- `approvalMode: 'signoff'` - lands as pending, holding its slots, until an
  approver decides.

Who may approve, enforced identically in the rules and the UI:

1. anyone with a record at `admins/{uid}`
2. anyone in `bookingApprovers/{uid}` - the Estate Manager and the two Heads of
   Extramurals (blanket override on any sign-off booking)
3. anyone listed in that asset's own `approvers`

All configurable in the UI - no code change to hand the role to someone else.
Every decision and override is stamped with who, when and why, on the booking.

The requester **cannot** self-confirm a sign-off asset: the rules force the
status on create to match the asset's `approvalMode`.

## Tests

```bash
npm run test:slots    # pure slot maths, no emulator
npm run test:rules    # database.rules.json against the Firebase emulator
```

`test:rules` is the important one - it proves against the real rules engine that
an overlapping booking is rejected, that two *simultaneous* requests for the same
slot produce exactly one winner, that a requester cannot self-confirm a sign-off
asset, and that the domain gate holds.

Re-run it after any change to `database.rules.json`.

### The emulator needs Java

There is no JRE on PATH on the current dev machine, but Embarcadero ships one.
Point at it for the session before running the rules tests:

```bash
export JAVA_HOME="/c/Program Files/Embarcadero/ELC5.51/Java/jre17"
export PATH="$JAVA_HOME/bin:$PATH"
```

PowerShell equivalent:

```powershell
$env:JAVA_HOME = "C:\Program Files\Embarcadero\ELC5.51\Java\jre17"
$env:PATH = "$env:JAVA_HOME\bin;$env:PATH"
```

Any JRE 11+ works; installing a normal JDK and skipping this is fine too.

## Deploying

The GitHub Action deploys the **frontend only**. The security rules are what
enforce every guarantee above, and they must be deployed separately:

```bash
firebase deploy --only database
```

Do this **before** merging to `main`, or the app will ship against rules that
have no `assets`, `bookings` or `bookingSlots` nodes and every write will fail.

## Staff only ever see Bookings

Ordinary teachers sign in to book rooms, vehicles and equipment. They do **not**
see the maintenance portal - no dashboard, no jobs, no tickets. This is enforced
in two places:

- **UI**: the maintenance nav is hidden, `/` redirects to `/bookings`, and the
  route guard bounces any `/admin/*` attempt.
- **Rules**: `tickets` and `staff` can only be read by admins and by people
  listed in `maintenanceStaff/{uid}`. Hiding the links alone would be cosmetic -
  the data would still be one fetch away.

Manage the list at **Admin -> Portal access** (`/admin/access`). Admins always
have access and do not need to be ticked.

### Deploy this in the right order

The rules lock tickets down to `admins/{uid}` and `maintenanceStaff/{uid}`.
Deploying them before the list is populated locks the maintenance team out of
their own tickets. So:

1. Merge and deploy the **frontend** first. Everyone who signs in now
   self-registers under `users/{uid}`.
2. Ask the maintenance team to sign in once so they appear in the picker.
3. Tick them under **Admin -> Portal access**.
4. Only then run `firebase deploy --only database`.

Admins are covered by `admins/{uid}` throughout, so you cannot lock yourself out.

## Access is restricted to @maristsj.co.za

Sign-in is now gated to school Google accounts, enforced in the rules rather than
just the UI. This also closed an existing hole where any Google account could
read every maintenance ticket.
