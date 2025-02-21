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