// src/utils/ticketStatusAutomation.js
// Utility to automatically update ticket status based on assignment

/**
 * Determines the appropriate status based on ticket assignment
 * @param {string} currentStatus - Current ticket status
 * @param {string|null} assignedTo - The user/staff member assigned (or null if unassigned)
 * @returns {string} - The appropriate status
 */
export const determineStatusFromAssignment = (currentStatus, assignedTo) => {
    // If ticket is completed, deleted, or paused, don't change it
    const protectedStatuses = ['completed', 'deleted', 'paused'];
    if (protectedStatuses.includes(currentStatus)) {
        return currentStatus;
    }

    // If ticket is being assigned for the first time
    if (assignedTo && currentStatus === 'new') {
        return 'in-progress';
    }

    // If ticket is being unassigned, set back to new
    if (!assignedTo && currentStatus === 'in-progress') {
        return 'new';
    }

    // Otherwise keep current status
    return currentStatus;
};

/**
 * Prepare ticket update data with automatic status management
 * @param {object} updates - The updates to apply
 * @param {object} currentTicket - The current ticket data
 * @returns {object} - Updated data with automatic status changes
 */
export const prepareTicketUpdate = (updates, currentTicket) => {
    const updatedData = { ...updates };

    // If assignment is being changed
    if ('assignedTo' in updates && updates.assignedTo !== currentTicket.assignedTo) {
        const newStatus = determineStatusFromAssignment(
            currentTicket.status || 'new',
            updates.assignedTo
        );

        // Only update status if it changed
        if (newStatus !== currentTicket.status) {
            updatedData.status = newStatus;
            updatedData.statusUpdatedAt = new Date().toISOString();
            updatedData.autoStatusUpdate = true; // Flag to indicate this was automatic

            console.log(`Auto-updating status from "${currentTicket.status}" to "${newStatus}" due to assignment change`);
        }

        // Reset assignment notification flag to trigger notification
        updatedData.assignmentNotified = null;
    }

    // Add timestamp
    updatedData.lastUpdated = new Date().toISOString();

    return updatedData;
};