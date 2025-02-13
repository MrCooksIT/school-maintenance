// functions/src/index.ts
import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';

admin.initializeApp();

export const createTicketFromEmail = functions.https.onRequest(async (request, response) => {
    // Enable CORS
    response.set('Access-Control-Allow-Origin', '*');

    if (request.method === 'OPTIONS') {
        response.set('Access-Control-Allow-Methods', 'POST');
        response.set('Access-Control-Allow-Headers', 'Content-Type');
        response.status(204).send('');
        return;
    }

    try {
        const ticketData = request.body;
        const ticketId = ticketData.ticketId || generateTicketId();

        // Add additional metadata
        const ticket = {
            ...ticketData,
            ticketId,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            status: 'new',
            updates: [{
                timestamp: admin.firestore.FieldValue.serverTimestamp(),
                type: 'created',
                message: 'Ticket created from email'
            }]
        };

        // Store in Firestore
        await admin.firestore()
            .collection('tickets')
            .doc(ticketId)
            .set(ticket);

        response.status(200).json({
            success: true,
            ticketId,
            message: 'Ticket created successfully'
        });
    } catch (error) {
        console.error('Error creating ticket:', error);
        response.status(500).json({
            success: false,
            error: 'Failed to create ticket'
        });
    }
});

function generateTicketId() {
    const timestamp = Date.now().toString(36);
    const randomStr = Math.random().toString(36).substring(2, 8);
    return `TK-${timestamp}${randomStr}`.toUpperCase();
}