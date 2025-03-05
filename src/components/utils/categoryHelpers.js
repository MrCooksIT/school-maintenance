// src/utils/categoryHelpers.js
import { ref, push, get, update } from 'firebase/database';

/**
 * Create a new category from a ticket category string if it doesn't exist
 * @param {Object} database Firebase database reference
 * @param {string} categoryName The category name to create
 * @returns {Promise<string|null>} The ID of the created or existing category, or null on error
 */
export const createCategoryFromTicket = async (database, categoryName) => {
    try {
        if (!categoryName || typeof categoryName !== 'string') {
            console.error('Invalid category name:', categoryName);
            return null;
        }

        // Check if this category already exists with this name
        const categoriesRef = ref(database, 'categories');
        const snapshot = await get(categoriesRef);

        if (snapshot.exists()) {
            const categories = Object.entries(snapshot.val());
            const existingCategory = categories.find(([_, cat]) =>
                cat.name.toLowerCase() === categoryName.toLowerCase()
            );

            if (existingCategory) {
                // Category already exists
                return existingCategory[0]; // Return the ID
            }
        }

        // Create new category
        const newCategoryRef = await push(categoriesRef, {
            name: categoryName,
            description: `Auto-created from ticket with category "${categoryName}"`,
            color: getRandomColor(),
            createdAt: new Date().toISOString(),
            autoCreated: true
        });

        return newCategoryRef.key;
    } catch (error) {
        console.error('Error creating category:', error);
        return null;
    }
};

/**
 * Generate a random color for auto-created categories
 * @returns {string} A hex color code
 */
const getRandomColor = () => {
    const colors = [
        '#3B82F6', // blue
        '#10B981', // green
        '#F59E0B', // amber
        '#6366F1', // indigo
        '#EC4899', // pink
        '#8B5CF6', // purple
        '#14B8A6', // teal
        '#F97316', // orange
    ];
    return colors[Math.floor(Math.random() * colors.length)];
};

/**
 * Updates a ticket's category field from a string to a proper category ID reference
 * @param {Object} database Firebase database reference
 * @param {string} ticketId The ticket ID to update
 * @param {string} categoryName The category name
 * @param {string} categoryId The category ID to use
 * @returns {Promise<boolean>} Success status
 */
export const updateTicketCategoryReference = async (database, ticketId, categoryName, categoryId) => {
    try {
        const ticketRef = ref(database, `tickets/${ticketId}`);
        await update(ticketRef, {
            category: categoryId,
            lastUpdated: new Date().toISOString()
        });

        return true;
    } catch (error) {
        console.error(`Error updating ticket category reference for ticket ${ticketId}:`, error);
        return false;
    }
};

/**
 * Process all tickets and create categories as needed
 * @param {Object} database Firebase database reference
 * @param {Array} tickets Array of ticket objects
 * @param {Object} processedCategories Object tracking processed category names
 * @param {Function} toastFn Function to display toast notifications
 * @returns {Promise<Object>} Updated processedCategories object
 */
export const processTicketCategories = async (database, tickets, processedCategories = {}, toastFn) => {
    const updatedProcessed = { ...processedCategories };

    try {
        if (!tickets || !tickets.length) return updatedProcessed;

        for (const ticket of tickets) {
            // Skip if no category, already processed, or it's already a category ID reference
            if (!ticket.category ||
                updatedProcessed[ticket.category] ||
                ticket.category.startsWith('-')) {
                continue;
            }

            // Only process if it's a plain text category name
            if (typeof ticket.category === 'string') {
                const categoryId = await createCategoryFromTicket(database, ticket.category);

                if (categoryId) {
                    // Update the ticket with the proper category ID
                    await updateTicketCategoryReference(database, ticket.id, ticket.category, categoryId);

                    // Show toast notification
                    if (toastFn) {
                        toastFn({
                            title: "Category Created",
                            description: `New category "${ticket.category}" has been automatically created`,
                            variant: "success"
                        });
                    }
                }

                // Mark as processed
                updatedProcessed[ticket.category] = true;
            }
        }
    } catch (error) {
        console.error('Error processing ticket categories:', error);
    }

    return updatedProcessed;
};