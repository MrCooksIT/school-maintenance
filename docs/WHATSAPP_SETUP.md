# WhatsApp Assignment Notifications - Setup Guide

When a ticket's `assignedTo` changes, the assigned staff member gets a WhatsApp
template message via the **Meta WhatsApp Business Cloud API**, using the number
captured on the Team page (`staff/{id}/phone`, format `+27XXXXXXXXX`).

It is sent from **Apps Script** (`apps-script/whatsappNotify.gs`), off the back
of the same run that sends the assignment emails. The Cloud API is only an
HTTPS POST, so this needs no Cloud Functions, no Blaze plan and no card on file.

> An earlier version of this lived in `functions/index.js` as a database
> trigger. It could never run - Cloud Functions requires the Blaze plan and the
> API was never enabled on this project - so it has been removed in favour of
> the Apps Script route.
>
> A Twilio experiment was also tried and abandoned. It used Twilio's shared
> sandbox number, which requires every recipient to send `join <code>` first,
> and it sent free-form text, which WhatsApp only allows within 24 hours of the
> person messaging you. Business-initiated messages need an approved template on
> every provider, Twilio included - so Twilio avoided none of the Meta setup
> below, it only added a markup.

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

## Part 3 - Switch it on

No deploy. Two steps in the Apps Script project:

1. Add `apps-script/whatsappNotify.gs` to the project.
2. Project Settings > Script Properties, add:

   | Property | Value |
   |---|---|
   | `WHATSAPP_TOKEN` | the permanent System User token from Part 2 |
   | `WHATSAPP_PHONE_NUMBER_ID` | from WhatsApp > API Setup |
   | `WHATSAPP_TEMPLATE_NAME` | optional, defaults to `task_assigned` |
   | `WHATSAPP_TEMPLATE_LANG` | optional, defaults to `en` |

Then run `testWhatsAppConfig()` (edit the number in it first). It reports what
is configured and sends one real message.

Until those properties are set, `sendAssignmentWhatsApp` logs that it is not
configured and returns false. Assignment emails carry on regardless, so it is
safe to add the file before the Meta side is finished.

## Part 4 - Wire it to assignment

In `notification-system.gs`, inside `sendAssignmentNotification`, replace the
Twilio block (everything under "STEP 3: WHATSAPP") with:

```js
sendAssignmentWhatsApp(ticket, staffData, ticketKey);
```

Then delete the Twilio functions from `code.gs`:

- `sendWhatsAppMessage`
- `sendWhatsAppWithButtons`
- `testWhatsAppSend`
- `testWhatsAppButtons`

**Rotate the Twilio auth token** in the Twilio console regardless. It sat in
`code.gs` in plaintext, so treat it as exposed even though the experiment is
over.

## What gets sent

The approved `task_assigned` template, with five parameters: staff name, ticket
id, subject, location, priority. The result of every attempt is written to the
ticket under `whatsappNotification` (`status: sent | failed`, plus the message
id or the error), so a failure shows up in the data rather than only in an
execution log.

## Who it can reach

10 of 13 staff records have a correctly formatted `+27` number. Gondre Scholtz,
Waseem Johnson and "Estate Team" have none and will be skipped until one is
added on the Team page. Numbers that are not `+27` followed by 9 digits are
skipped rather than sent to, so a typo cannot message a stranger.

Anyone can opt out by setting `notificationPreferences.whatsapp` to false on
their staff record.
