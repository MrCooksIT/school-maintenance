// src/utils/firebaseDebugHelper.js
import { ref, update, push, get } from 'firebase/database';
import { database } from '@/config/firebase';

/**
 * A collection of utility functions for debugging Firebase database issues
 */
const FirebaseDebugHelper = {
    /**
     * Test if we can write to a specific database path
     * @param {string} path - The database path to test
     * @param {object} testData - The test data to write
     * @returns {Promise<object>} - Result of the write test
     */
    async testWrite(path, testData = { test: true, timestamp: Date.now() }) {
        try {
            console.log(`Testing write to ${path}...`);

            const dbRef = ref(database, path);
            await update(dbRef, testData);

            return {
                success: true,
                message: `Successfully wrote to ${path}`,
                data: testData
            };
        } catch (error) {
            console.error(`Write test failed for ${path}:`, error);

            return {
                success: false,
                message: `Failed to write to ${path}: ${error.message}`,
                error
            };
        }
    },

    /**
     * Test if we can read from a specific database path
     * @param {string} path - The database path to test
     * @returns {Promise<object>} - Result of the read test
     */
    async testRead(path) {
        try {
            console.log(`Testing read from ${path}...`);

            const dbRef = ref(database, path);
            const snapshot = await get(dbRef);

            return {
                success: true,
                message: `Successfully read from ${path}`,
                exists: snapshot.exists(),
                data: snapshot.val()
            };
        } catch (error) {
            console.error(`Read test failed for ${path}:`, error);

            return {
                success: false,
                message: `Failed to read from ${path}: ${error.message}`,
                error
            };
        }
    },

    /**
     * Test reopening a ticket directly
     * @param {string} ticketId - The ID of the ticket to reopen
     * @returns {Promise<object>} - Result of the reopen test
     */
    async testReopenTicket(ticketId) {
        try {
            console.log(`Testing reopening ticket ${ticketId}...`);

            // First, check if the ticket exists and is completed
            const ticketRef = ref(database, `tickets/${ticketId}`);
            const snapshot = await get(ticketRef);

            if (!snapshot.exists()) {
                return {
                    success: false,
                    message: `Ticket ${ticketId} does not exist`
                };
            }

            const ticket = snapshot.val();

            if (ticket.status !== 'completed') {
                return {
                    success: false,
                    message: `Ticket ${ticketId} is not completed (current status: ${ticket.status})`
                };
            }

            // Try to update the ticket status
            const updates = {
                status: 'in-progress',
                completedAt: null,
                reopenedAt: new Date().toISOString(),
                reopenedBy: 'debug-helper',
                lastUpdated: new Date().toISOString(),
                skipEmailNotification: true
            };

            await update(ticketRef, updates);

            // Add a system comment
            const commentsRef = ref(database, `tickets/${ticketId}/comments`);
            await push(commentsRef, {
                content: "Ticket reopened by debug helper",
                user: 'Debug System',
                timestamp: new Date().toISOString(),
                isSystemComment: true
            });

            return {
                success: true,
                message: `Successfully reopened ticket ${ticketId}`,
                updates
            };
        } catch (error) {
            console.error(`Reopen test failed for ticket ${ticketId}:`, error);

            return {
                success: false,
                message: `Failed to reopen ticket ${ticketId}: ${error.message}`,
                error
            };
        }
    },

    /**
     * Run a complete diagnostic on Firebase permissions
     * @returns {Promise<object>} - Complete diagnostics result
     */
    async runDiagnostics() {
        const results = {
            timestamp: new Date().toISOString(),
            read: {},
            write: {}
        };

        // Test critical paths
        const paths = [
            'tickets',
            'staff',
            'categories',
            'locations',
            'notifications'
        ];

        // Run read tests
        for (const path of paths) {
            results.read[path] = await this.testRead(path);
        }

        // Run write tests (only on safe paths)
        const writePaths = [
            'debug/test',
            'notifications'
        ];

        for (const path of writePaths) {
            results.write[path] = await this.testWrite(path, {
                debug: true,
                timestamp: Date.now(),
                source: 'diagnostics'
            });
        }

        console.log('Firebase diagnostics complete:', results);
        return results;
    }
};

export default FirebaseDebugHelper;