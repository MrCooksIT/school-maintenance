// src/services/ticketOperations.js
import { ref, update, push, get } from 'firebase/database';
import { database } from '@/config/firebase';

/**
 * Centralized module for ticket operations to ensure consistency
 */
const TicketOperations = {
    /**
     * Reopen a completed ticket
     * @param {string} ticketId - The ID of the ticket to reopen
     * @param {object} userData - Information about the user performing the action
     * @param {boolean} skipNotification - Whether to skip email notification
     * @returns {Promise<object>} - Result of the operation
     */
    async reopenTicket(ticketId, userData = {}, skipNotification = true) {
        try {
            console.log(`Reopening ticket ${ticketId}...`);

            // Create update object
            const updates = {
                status: 'in-progress',
                completedAt: null, // Clear completion date
                reopenedAt: new Date().toISOString(),
                reopenedBy: userData.uid || 'unknown-user',
                lastUpdated: new Date().toISOString(),
                // Clear any reopen request flags
                reopenRequested: false,
                reopenRequestedAt: null
            };

            // Add flag to prevent duplicate email notifications if needed
            if (skipNotification) {
                updates.skipEmailNotification = true;
            }

            // Update the ticket
            const ticketRef = ref(database, `tickets/${ticketId}`);
            await update(ticketRef, updates);

            // Add a system comment
            const commentsRef = ref(database, `tickets/${ticketId}/comments`);
            await push(commentsRef, {
                content: userData.role ?
                    `Ticket reopened by ${userData.role}` :
                    "Ticket reopened by administrator",
                user: 'System',
                userEmail: 'system@maintenance.app',
                timestamp: new Date().toISOString(),
                isSystemComment: true
            });

            return {
                success: true,
                message: `Successfully reopened ticket ${ticketId}`,
                updates
            };
        } catch (error) {
            console.error(`Error reopening ticket ${ticketId}:`, error);
            return {
                success: false,
                message: `Failed to reopen ticket: ${error.message}`,
                error
            };
        }
    },

    /**
     * Request to reopen a ticket (for non-admin users)
     * @param {string} ticketId - The ID of the ticket 
     * @param {object} userData - Information about the user making the request
     * @returns {Promise<object>} - Result of the operation
     */
    async requestReopenTicket(ticketId, userData = {}) {
        try {
            console.log(`Requesting reopen for ticket ${ticketId}...`);

            // Create update object
            const updates = {
                reopenRequested: true,
                reopenRequestedAt: new Date().toISOString(),
                reopenRequestedBy: userData.uid || 'unknown-user',
                lastUpdated: new Date().toISOString()
            };

            // Update the ticket
            const ticketRef = ref(database, `tickets/${ticketId}`);
            await update(ticketRef, updates);

            // Add a system comment
            const commentsRef = ref(database, `tickets/${ticketId}/comments`);
            await push(commentsRef, {
                content: "Ticket reopen requested - waiting for admin approval",
                user: 'System',
                userEmail: 'system@maintenance.app',
                timestamp: new Date().toISOString(),
                isSystemComment: true
            });

            // Create a notification for admins
            try {
                const ticket = (await get(ticketRef)).val();

                const notificationsRef = ref(database, 'notifications');
                await push(notificationsRef, {
                    title: "Reopen Request",
                    message: `Ticket #${ticket.ticketId || ticketId} has been requested to be reopened`,
                    type: "reopen_request",
                    userRole: "admin", // Target admins
                    ticketId: ticketId,
                    ticketNumber: ticket.ticketId || ticketId,
                    priority: ticket.priority || 'medium',
                    createdAt: new Date().toISOString(),
                    read: false
                });
            } catch (err) {
                console.error("Failed to create admin notification", err);
                // Continue anyway - this is not critical
            }

            return {
                success: true,
                message: `Successfully requested reopening of ticket ${ticketId}`,
                updates
            };
        } catch (error) {
            console.error(`Error requesting reopen for ticket ${ticketId}:`, error);
            return {
                success: false,
                message: `Failed to request reopening: ${error.message}`,
                error
            };
        }
    },

    /**
     * Pause a ticket with reason
     * @param {string} ticketId - The ID of the ticket
     * @param {object} pauseData - Pause reason and other data
     * @param {object} userData - Information about the user performing the action
     * @returns {Promise<object>} - Result of the operation
     */
    async pauseTicket(ticketId, pauseData = {}, userData = {}) {
        try {
            console.log(`Pausing ticket ${ticketId}...`);

            // Create update object
            const updates = {
                status: 'paused',
                pausedAt: new Date().toISOString(),
                pauseReason: pauseData.reason || 'No reason provided',
                pauseData: pauseData,
                lastUpdated: new Date().toISOString()
            };

            // Update the ticket
            const ticketRef = ref(database, `tickets/${ticketId}`);
            await update(ticketRef, updates);

            // Add a system comment
            const commentsRef = ref(database, `tickets/${ticketId}/comments`);
            await push(commentsRef, {
                content: `Ticket paused: ${pauseData.reason}${pauseData.estimatedDuration ? ` - Estimated duration: ${pauseData.estimatedDuration.replace('_', ' ')}` : ''}`,
                user: 'System',
                userEmail: 'system@maintenance.app',
                timestamp: new Date().toISOString(),
                isSystemComment: true
            });

            return {
                success: true,
                message: `Successfully paused ticket ${ticketId}`,
                updates
            };
        } catch (error) {
            console.error(`Error pausing ticket ${ticketId}:`, error);
            return {
                success: false,
                message: `Failed to pause ticket: ${error.message}`,
                error
            };
        }
    },

    /**
     * Resume a paused ticket
     * @param {string} ticketId - The ID of the ticket
     * @param {object} userData - Information about the user performing the action
     * @returns {Promise<object>} - Result of the operation
     */
    async resumeTicket(ticketId, userData = {}) {
        try {
            console.log(`Resuming ticket ${ticketId}...`);

            // Create update object
            const updates = {
                status: 'in-progress',
                pausedAt: null,
                pauseReason: null,
                pauseData: null,
                lastUpdated: new Date().toISOString()
            };

            // Update the ticket
            const ticketRef = ref(database, `tickets/${ticketId}`);
            await update(ticketRef, updates);

            // Add a system comment
            const commentsRef = ref(database, `tickets/${ticketId}/comments`);
            await push(commentsRef, {
                content: "Ticket resumed from paused status",
                user: 'System',
                userEmail: 'system@maintenance.app',
                timestamp: new Date().toISOString(),
                isSystemComment: true
            });

            return {
                success: true,
                message: `Successfully resumed ticket ${ticketId}`,
                updates
            };
        } catch (error) {
            console.error(`Error resuming ticket ${ticketId}:`, error);
            return {
                success: false,
                message: `Failed to resume ticket: ${error.message}`,
                error
            };
        }
    },

    /**
     * Check if user has admin permissions (helper function)
     * @param {object} user - The user object
     * @param {string} userRole - The user's role
     * @returns {boolean} - Whether the user has admin permissions
     */
    isUserAdmin(user, userRole) {
        return (
            // Check from AuthProvider
            userRole === 'admin' ||
            userRole === 'supervisor' ||
            userRole === 'estate_manager' ||
            // Check from user object
            user?.isAdmin === true ||
            user?.admin === true ||
            user?.role === 'admin' ||
            // Check from email patterns
            (user?.email && (
                user?.email.includes('@admin') ||
                user?.email.includes('estate') ||
                user?.email.includes('supervisor') ||
                user?.email.includes('acoetzee')
            )) ||
            // Check localStorage for debug override (development only)
            (typeof window !== 'undefined' &&
                window.localStorage &&
                window.localStorage.getItem('debug_admin_override') === 'true')
        );
    }
};

export default TicketOperations;