// src/utils/bulkTicketAssignment.js
// Utility for handling bulk ticket assignments with automatic status updates

import { ref, update, get } from 'firebase/database';
import { database } from '@/config/firebase';
import { prepareTicketUpdate } from './ticketStatusAutomation';

/**
 * Assign a ticket with automatic status management
 * @param {string} ticketId - The ticket ID
 * @param {string} assignedTo - The staff member ID to assign
 * @returns {Promise<object>} - Result of the operation
 */
export const assignTicketWithAutoStatus = async (ticketId, assignedTo) => {
    try {
        // Get current ticket data
        const ticketRef = ref(database, `tickets/${ticketId}`);
        const snapshot = await get(ticketRef);

        if (!snapshot.exists()) {
            throw new Error('Ticket not found');
        }

        const currentTicket = snapshot.val();

        // Prepare update with automatic status management
        const updates = prepareTicketUpdate(
            { assignedTo },
            currentTicket
        );

        // Apply the update
        await update(ticketRef, updates);

        return {
            success: true,
            ticketId,
            statusChanged: updates.autoStatusUpdate,
            newStatus: updates.status
        };
    } catch (error) {
        console.error(`Error assigning ticket ${ticketId}:`, error);
        return {
            success: false,
            ticketId,
            error: error.message
        };
    }
};

/**
 * Bulk assign multiple tickets with automatic status updates
 * @param {Array<string>} ticketIds - Array of ticket IDs to assign
 * @param {string} assignedTo - The staff member ID to assign
 * @returns {Promise<object>} - Summary of results
 */
export const bulkAssignTickets = async (ticketIds, assignedTo) => {
    const results = {
        successful: [],
        failed: [],
        statusesChanged: 0
    };

    for (const ticketId of ticketIds) {
        const result = await assignTicketWithAutoStatus(ticketId, assignedTo);

        if (result.success) {
            results.successful.push(ticketId);
            if (result.statusChanged) {
                results.statusesChanged++;
            }
        } else {
            results.failed.push({ ticketId, error: result.error });
        }
    }

    return results;
};

/**
 * Unassign a ticket (set assignedTo to null) with automatic status reset
 * @param {string} ticketId - The ticket ID
 * @returns {Promise<object>} - Result of the operation
 */
export const unassignTicketWithAutoStatus = async (ticketId) => {
    return await assignTicketWithAutoStatus(ticketId, null);
};