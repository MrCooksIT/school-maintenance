# WhatsApp Assignment Notifications - Setup Guide

When a ticket's `assignedTo` changes in the Realtime Database, the
`onTicketAssigned` Cloud Function (`functions/index.js`) sends the assigned
staff member a WhatsApp template message via the **Meta WhatsApp Business
Cloud API**, using the phone number captured on the Team page
(`staff/{id}/phone`, format `+27XXXXXXXXX`).

The result of every attempt is written back to the ticket under
`whatsappNotification` (`status: sent | failed`), so failures are visible in
the database, not silent.

---

## Part 1 - Estate manager / business side

1. **Meta Business Manager** - the school almost certainly already has one
   (Facebook page + ads). Use that one at https://business.facebook.com -
   do NOT create a second.
2. **Business verification** - check Business Settings > Security Centre.
   If the school runs ads it is likely already verified. If not, submit the
   school's registration documents (legal name must match).
3. **Dedicated phone number** - a prepaid SIM the school owns:
   - Must receive one SMS or voice call (registration OTP).
   - Must NOT be registered on the normal WhatsApp / WhatsApp Business app.
   - This becomes "the maintenance number" staff see permanently.
4. **Payment method** - add a school card under WhatsApp Manager > Payment
   settings. Assignment messages are "utility" category, roughly
   R0.10-R0.40 each (budget < R200/month at 500 assignments).
5. **Add the developer** (acoetzee@maristsj.co.za) as an admin of the
   Business Manager.

## Part 2 - Developer side (after being added)

1. At https://developers.facebook.com create an app (type: Business),
   linked to the school's Business Manager. Add the **WhatsApp** product.
2. Under WhatsApp > API Setup: register the dedicated number. Note the
   **Phone number ID**.
3. Create a **System User** (Business Settings > Users > System users),
   assign it the app + WhatsApp account, and generate a **permanent access
   token** with `whatsapp_business_messaging` permission.
   (The dashboard's temporary token expires in 24h - do not ship it.)
4. Submit the message template in WhatsApp Manager > Message templates:
   - Name: `task_assigned`, Category: **Utility**, Language: English
   - Body:
     ```
     Hi {{1}}, you've been assigned maintenance job {{2}}: {{3}} at {{4}}. Priority: {{5}}.
     ```
   - Params: 1 = staff name, 2 = ticket id, 3 = subject, 4 = location, 5 = priority.
   Approval is usually under a day.

## Part 3 - Deploy

```bash
# one-time: store the permanent token as a secret
firebase functions:secrets:set WHATSAPP_TOKEN

# copy functions/.env.example to functions/.env and fill in
# WHATSAPP_PHONE_NUMBER_ID (+ template name/lang if different)

firebase deploy --only functions
```

## Testing

1. Add yourself on the Team page with your own `+27...` number.
2. Assign any test ticket to yourself.
3. You should get the WhatsApp within seconds. If not, check:
   - the ticket's `whatsappNotification` node for the recorded error
   - `firebase functions:log --only onTicketAssigned`

## Known failure modes (why the old setup "just stopped")

- **Expired token** - temporary dashboard tokens die after 24h; use the
  system-user permanent token.
- **Template paused/rejected** - Meta pauses templates with bad quality
  ratings; check WhatsApp Manager.
- **Stale phone numbers** - the recipient must have WhatsApp active on the
  exact number stored on the Team page. Errors are recorded on the ticket.
- **Payment method lapsed** - messages stop silently if billing fails.
