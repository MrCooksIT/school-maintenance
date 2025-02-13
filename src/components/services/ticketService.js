// src/services/ticketService.js
import { db } from '../config/firebase';
import {
    collection,
    addDoc,
    updateDoc,
    doc,
    query,
    where,
    getDocs
} from 'firebase/firestore';

const COLLECTION_NAME = 'tickets';

export const ticketService = {
    // Create a new ticket
    async createTicket(ticketData) {
        try {
            const docRef = await addDoc(collection(db, COLLECTION_NAME), {
                ...ticketData,
                createdAt: new Date().toISOString(),
                status: 'new',
                isEscalated: false
            });
            return docRef.id;
        } catch (error) {
            console.error('Error creating ticket:', error);
            throw error;
        }
    },

    // Update ticket status
    async updateTicketStatus(ticketId, status, completedBy = null) {
        try {
            const ticketRef = doc(db, COLLECTION_NAME, ticketId);
            const updateData = {
                status,
                updatedAt: new Date().toISOString()
            };

            if (status === 'completed') {
                updateData.completedBy = completedBy;
                updateData.completedAt = new Date().toISOString();
            }

            await updateDoc(ticketRef, updateData);
        } catch (error) {
            console.error('Error updating ticket:', error);
            throw error;
        }
    },

    // Assign ticket to staff
    async assignTicket(ticketId, staffEmail) {
        try {
            const ticketRef = doc(db, COLLECTION_NAME, ticketId);
            await updateDoc(ticketRef, {
                assignedTo: staffEmail,
                status: 'assigned',
                updatedAt: new Date().toISOString()
            });
        } catch (error) {
            console.error('Error assigning ticket:', error);
            throw error;
        }
    },

    // Get tickets based on status
    async getTicketsByStatus(status) {
        try {
            const q = query(
                collection(db, COLLECTION_NAME),
                where("status", "==", status)
            );
            const querySnapshot = await getDocs(q);
            return querySnapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
        } catch (error) {
            console.error('Error getting tickets:', error);
            throw error;
        }
    }
};