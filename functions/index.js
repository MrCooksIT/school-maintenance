const functions = require('firebase-functions');
const admin = require('firebase-admin');
const express = require('express');
const cors = require('cors');
const nodemailer = require('nodemailer');

admin.initializeApp();
const app = express();
app.use(cors({ origin: true }));

// Email configuration
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.GMAIL_USER || 'maintainance@maristsj.co.za',
        pass: process.env.GMAIL_PASS
    }
});

// Alert recipients
const ALERT_RECIPIENTS = [
    'estates@maristsj.co.za',
    // Add more emails as needed
];

// Your existing ticket creation endpoint
app.post('/ticket', async (req, res) => {
    try {
        const ticketData = req.body;
        const ticketRef = await admin.firestore()
            .collection('tickets')
            .add({
                ...ticketData,
                createdAt: admin.firestore.FieldValue.serverTimestamp(),
                updatedAt: admin.firestore.FieldValue.serverTimestamp()
            });

        // Send new ticket alert
        await sendNewTicketAlert(ticketData, ticketRef.id);

        res.json({
            success: true,
            ticketId: ticketRef.id
        });
    } catch (error) {
        console.error('Error creating ticket:', error);
        res.status(500).send('Error creating ticket');
    }
});

// Helper function to send new ticket alerts
async function sendNewTicketAlert(ticket, ticketId) {
    const mailOptions = {
        from: 'maintainance@maristsj.co.za',
        to: ALERT_RECIPIENTS.join(','),
        subject: `New Maintenance Ticket: ${ticket.subject}`,
        html: `
      <h2>New Maintenance Ticket Created</h2>
      <p><strong>Ticket ID:</strong> ${ticketId}</p>
      <p><strong>Subject:</strong> ${ticket.subject}</p>
      <p><strong>Reported By:</strong> ${ticket.requester.name} ${ticket.requester.surname}</p>
      <p><strong>Priority:</strong> ${ticket.priority}</p>
      <p><strong>Description:</strong></p>
      <p>${ticket.description}</p>
      <p><strong>Location:</strong> ${ticket.location || 'Not specified'}</p>
    `
    };

    try {
        await transporter.sendMail(mailOptions);
    } catch (error) {
        console.error('Error sending email alert:', error);
        // Don't throw the error - we don't want to fail the ticket creation
    }
}

// ---------------------------------------------------------------------------
// WhatsApp assignment notifications (Meta WhatsApp Business Cloud API)
//
// Fires when a ticket's assignedTo changes in the Realtime Database, looks up
// the staff member's phone number under staff/{id}, and sends the approved
// template message. Requires:
//   - secret  WHATSAPP_TOKEN            (firebase functions:secrets:set WHATSAPP_TOKEN)
//   - env     WHATSAPP_PHONE_NUMBER_ID  (functions/.env)
//   - env     WHATSAPP_TEMPLATE_NAME    (functions/.env, default: task_assigned)
// See docs/WHATSAPP_SETUP.md for the full setup checklist.
// ---------------------------------------------------------------------------

const WHATSAPP_API_VERSION = process.env.WHATSAPP_API_VERSION || 'v22.0';

// Template body params may not contain newlines, tabs or 4+ consecutive spaces
function sanitizeTemplateParam(value, fallback) {
    const text = String(value ?? '').replace(/\s+/g, ' ').trim();
    return text || fallback;
}

async function sendWhatsAppTemplate({ to, params }) {
    const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
    const templateName = process.env.WHATSAPP_TEMPLATE_NAME || 'task_assigned';
    const languageCode = process.env.WHATSAPP_TEMPLATE_LANG || 'en';

    if (!process.env.WHATSAPP_TOKEN || !phoneNumberId) {
        throw new Error('WhatsApp is not configured: missing WHATSAPP_TOKEN secret or WHATSAPP_PHONE_NUMBER_ID env');
    }

    const response = await fetch(
        `https://graph.facebook.com/${WHATSAPP_API_VERSION}/${phoneNumberId}/messages`,
        {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${process.env.WHATSAPP_TOKEN}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                messaging_product: 'whatsapp',
                to,
                type: 'template',
                template: {
                    name: templateName,
                    language: { code: languageCode },
                    components: [{
                        type: 'body',
                        parameters: params.map(text => ({ type: 'text', text }))
                    }]
                }
            })
        }
    );

    const result = await response.json();
    if (!response.ok) {
        throw new Error(`WhatsApp API error ${response.status}: ${JSON.stringify(result.error || result)}`);
    }
    return result;
}

exports.onTicketAssigned = functions
    .runWith({ secrets: ['WHATSAPP_TOKEN'] })
    .database.ref('/tickets/{ticketId}')
    .onWrite(async (change, context) => {
        if (!change.after.exists()) return null; // ticket deleted

        const before = change.before.exists() ? change.before.val() : {};
        const after = change.after.val();

        // Only act when the assignment actually changes to someone
        if (!after.assignedTo || after.assignedTo === before.assignedTo) return null;

        const db = admin.database();
        const staffSnap = await db.ref(`staff/${after.assignedTo}`).once('value');
        if (!staffSnap.exists()) {
            console.warn(`Ticket ${context.params.ticketId} assigned to unknown staff id ${after.assignedTo}`);
            return null;
        }

        const staff = staffSnap.val();
        const whatsappEnabled = staff.notificationPreferences?.whatsapp !== false;
        const phoneDigits = String(staff.phone || '').replace(/\D/g, '');

        if (!whatsappEnabled || !phoneDigits) {
            console.log(`Skipping WhatsApp for ticket ${context.params.ticketId}: staff ${staff.name || after.assignedTo} has no phone or notifications disabled`);
            return null;
        }

        // Location may be an id under locations/ or free text
        let locationName = after.location || '';
        if (locationName) {
            const locationSnap = await db.ref(`locations/${locationName}/name`).once('value');
            if (locationSnap.exists()) locationName = locationSnap.val();
        }

        const params = [
            sanitizeTemplateParam(staff.name, 'there'),
            sanitizeTemplateParam(after.ticketId || context.params.ticketId, context.params.ticketId),
            sanitizeTemplateParam(after.subject || after.title, 'Maintenance task'),
            sanitizeTemplateParam(locationName, 'See ticket for details'),
            sanitizeTemplateParam(after.priority, 'medium')
        ];

        try {
            const result = await sendWhatsAppTemplate({ to: phoneDigits, params });
            console.log(`WhatsApp sent for ticket ${context.params.ticketId} to ${staff.name} (${phoneDigits}), message id: ${result.messages?.[0]?.id}`);
            await change.after.ref.child('whatsappNotification').set({
                status: 'sent',
                to: phoneDigits,
                staffId: after.assignedTo,
                messageId: result.messages?.[0]?.id || null,
                sentAt: new Date().toISOString()
            });
        } catch (error) {
            // Log and record, but never fail the ticket update itself
            console.error(`WhatsApp send failed for ticket ${context.params.ticketId}:`, error);
            await change.after.ref.child('whatsappNotification').set({
                status: 'failed',
                to: phoneDigits,
                staffId: after.assignedTo,
                error: String(error.message || error),
                failedAt: new Date().toISOString()
            });
        }

        return null;
    });

// New function to handle ticket status updates
exports.onTicketStatusChange = functions.firestore
    .document('tickets/{ticketId}')
    .onUpdate(async (change, context) => {
        const beforeData = change.before.data();
        const afterData = change.after.data();

        // Only proceed if status has changed
        if (beforeData.status === afterData.status) return null;

        let emailContent = '';
        let subject = '';

        if (afterData.status === 'in-progress') {
            const assignedStaff = afterData.assignedTo ?
                `and assigned to ${afterData.assignedStaff.name}` : '';
            subject = `Maintenance Ticket ${context.params.ticketId} - In Progress`;
            emailContent = `
        <h2>Your maintenance ticket is now in progress ${assignedStaff}</h2>
        <p><strong>Ticket ID:</strong> ${context.params.ticketId}</p>
        <p><strong>Subject:</strong> ${afterData.subject}</p>
        <p><strong>Status:</strong> In Progress</p>
        <p><strong>Updated:</strong> ${new Date(afterData.updatedAt).toLocaleString()}</p>
      `;
        } else if (afterData.status === 'completed') {
            subject = `Maintenance Ticket ${context.params.ticketId} - Completed`;
            emailContent = `
        <h2>Your maintenance ticket has been completed</h2>
        <p><strong>Ticket ID:</strong> ${context.params.ticketId}</p>
        <p><strong>Subject:</strong> ${afterData.subject}</p>
        <p><strong>Completed On:</strong> ${new Date(afterData.completedAt).toLocaleString()}</p>
        <p><strong>Completed By:</strong> ${afterData.completedBy || 'Maintenance Staff'}</p>
      `;
        }

        if (emailContent) {
            const mailOptions = {
                from: 'maintainance@maristsj.co.za',
                to: afterData.requester.email,
                subject: subject,
                html: emailContent
            };

            try {
                await transporter.sendMail(mailOptions);
            } catch (error) {
                console.error('Error sending status update email:', error);
            }
        }

        return null;
    });

exports.api = functions.https.onRequest(app);