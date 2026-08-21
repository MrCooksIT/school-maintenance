# Apps Script migration checklist

The database no longer allows anonymous reads or writes. The script must use a
service-account token. Work through this in order.

## 1. Add the two new files

Add `firebaseAuth.gs` and `firebaseData.gs` to the Apps Script project.

## 2. Set the service account

Firebase console -> Project settings -> Service accounts -> Generate new private key.
Apps Script -> Project Settings -> Script Properties:

    name:  FIREBASE_SERVICE_ACCOUNT
    value: <the entire JSON file contents>

Run `testFirebaseAuth()`. It must log "Firebase authentication is working."
Do not go further until it does.

## 3. Delete ONLY these

Apps Script concatenates every file, and the LAST definition of a function wins.
Duplicates silently override the new code, so they have to go.

### simplified-firebase.gs -> DELETE THE WHOLE FILE
Every function in it is replaced by firebaseData.gs. The only things lost are
`testFirebaseConnection` / `testFirebaseNow`, and `testFirebaseAuth()` covers
the same ground.

### code.gs -> KEEP THE FILE, delete these functions
- `getTicketsFromFirebase`        (duplicate)
- `getTicketsUsingServiceAccount` (superseded by firebaseAuth.gs)
- `getStaffDetails`               (duplicate)
- the SECOND `formatDate`         (this file defines it twice - keep one)

Everything else in code.gs is needed: onNewEmail, doGet, setupMaintenanceTriggers,
sendTicketConfirmation, generateTicketId, the WhatsApp functions.

### notification-system.gs -> KEEP THE FILE, delete these functions
- `getTicketsFromFirebase` (duplicate)
- `getTicketFromFirebase`  (duplicate)
- `getStaffDetails`        (duplicate)
- `updateTicketDirectly`   (duplicate)

Everything else is needed: checkForStatusChanges, all the send*Notification
functions, sendAssignmentNotification, createReopenUrl.

### email-processor.gs -> CHANGE NOTHING
No duplicates. All unique. (One small fix suggested in section 5.)

### Firebase.gs -> DELETE THE WHOLE FILE, if it exists
It holds a service-account private key in plaintext and defines a conflicting
`getAccessToken` and `getStaffDetails`. Revoke that key in the Firebase console.

## 4. Verify

    testFirebaseAuth()          -> reads /tickets and /staff
    testStatusNotifications()   -> should now find tickets, not "No tickets found"

Then send yourself a test email to the maintenance address and confirm a ticket
appears in the app.

## 5. The five broken functions - now fixed

Add `maintenanceTools.gs` as well. It contains working replacements, all of which
are DRY RUN by default and archive before removing anything.

| Old (could not run) | Replacement |
|---|---|
| `identifyFakeTickets`, `cleanupFakeTickets`, `previewCleanup`, `executeCleanup` | `findSystemNoiseTickets()` |
| `enhancedDuplicateCleanup`, `handleValueableDuplicate`, `removeDuplicateTicket` | `findDuplicateTickets()` |
| `checkForExistingTicket` (always returned false) | fixed, authenticated |
| `uploadAttachmentToFirebase` | delete - unused, `processAttachments` uses Drive |
| `comprehensiveDuplicateCleanup` (never existed) | remove the calls, see below |

### code.gs - delete these too
- `identifyFakeTickets`
- `cleanupFakeTickets`
- `previewCleanup`
- `executeCleanup`
- `emergencyInfo`
- `enhancedDuplicateCleanup`
- `handleValueableDuplicate`
- `removeDuplicateTicket`

Then in `repairMaintenanceSystem` delete the line:

    enhancedDuplicateCleanup();

and in `completeSystemSetup` delete the line:

    comprehensiveDuplicateCleanup();

That function never existed, so `completeSystemSetup` has always thrown at that
point. Setup should not be deleting tickets anyway - clean-up is now a separate,
deliberate action you run by hand.

### email-processor.gs - delete these
- `checkForExistingTicket`      (replaced in maintenanceTools.gs)
- `uploadAttachmentToFirebase`  (unused and broken)

Keep everything else in that file.

## 6. Using the clean-up tools

Always look at the dry run first.

    findDuplicateTickets()        // report only
    findDuplicateTickets(false)   // mark duplicates - never deletes

    findSystemNoiseTickets()      // report only
    findSystemNoiseTickets(false) // archive to /archived_tickets, then remove

Duplicates are only grouped when the same person raised the same subject within
7 days. A fault reported in March and again in September is treated as a genuine
repeat, not a duplicate.

## 7. Still to do, outside the script

- Revoke the old service-account key in the Firebase console.
- Rotate the Twilio credentials and move them into Script Properties.
