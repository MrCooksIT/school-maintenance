const functions = require('firebase-functions');
const admin = require('firebase-admin');
const express = require('express');
const cors = require('cors');

admin.initializeApp();

const app = express();
app.use(cors({ origin: true }));

// Create ticket endpoint
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

        res.json({
            success: true,
            ticketId: ticketRef.id
        });
    } catch (error) {
        console.error('Error creating ticket:', error);
        res.status(500).send('Error creating ticket');
    }
});

exports.api = functions.https.onRequest(app);