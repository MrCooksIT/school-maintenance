// src/services/ticketService.js
import { ref, update, get } from 'firebase/database';
import { database } from '../config/firebase';

export const updateTicket = async (ticketId, updateData) => {
    const ticketRef = ref(database, `tickets/${ticketId}`);
    try {
        await update(ticketRef, {
            ...updateData,
            lastUpdated: new Date().toISOString()
        });
    } catch (error) {
        console.error('Error updating ticket:', error);
        throw error;
    }
};

export const getTicketsByStaff = async (staffId) => {
    const ticketsRef = ref(database, 'tickets');
    try {
        const snapshot = await get(ticketsRef);
        if (snapshot.exists()) {
            const tickets = snapshot.val();
            return Object.entries(tickets)
                .filter(([_, ticket]) => ticket.assignedTo === staffId)
                .map(([id, ticket]) => ({ id, ...ticket }));
        }
        return [];
    } catch (error) {
        console.error('Error fetching staff tickets:', error);
        throw error;
    }
};