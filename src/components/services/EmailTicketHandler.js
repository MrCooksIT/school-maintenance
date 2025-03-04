// src/services/EmailTicketHandler.js
import { ref, push, update, get } from 'firebase/database';
import { database } from '@/config/firebase';
import { EmailParser } from './EmailParser';
import { EmailAttachmentService } from '/EmailAttachmentService';

/**
 * Service to handle incoming email tickets
 */
export const EmailTicketHandler = {
    /**
     * Process an incoming email and create a new ticket
     * @param {Object} email - Email object
     * @returns {Promise<Object>} - Created ticket data
     */
    async processIncomingEmail(email) {
        try {
            // Parse the email to extract ticket data and attachments
            const { ticketData, attachments, senderEmail } = EmailParser.parseEmailToTicket(email);

            // Generate a ticket ID (format: SMC-YYYYMMDD-XXX)
            const ticketId = await this.generateTicketId();

            // Create the ticket in the database
            const ticketsRef = ref(database, 'tickets');
            const newTicketRef = await push(ticketsRef, {
                ...ticketData,
                ticketId: ticketId,
                lastUpdated: new Date().toISOString()
            });

            const newTicketId = newTicketRef.key;

            // Process and attach any email attachments
            if (attachments && attachments.length > 0) {
                await EmailAttachmentService.processEmailAttachments(
                    newTicketId,
                    attachments,
                    senderEmail
                );
            }

            // Retrieve the created ticket
            const ticketSnapshot = await get(ref(database, `tickets/${newTicketId}`));

            return {
                success: true,
                ticketId: ticketId,
                firebaseId: newTicketId,
                ticket: ticketSnapshot.val()
            };
        } catch (error) {
            console.error('Error processing incoming email:', error);
            return {
                success: false,
                error: error.message
            };
        }
    },

    /**
     * Process an email reply to an existing ticket
     * @param {Object} email - Email object
     * @param {string} existingTicketId - ID of the existing ticket
     * @returns {Promise<Object>} - Updated ticket data
     */
    async processEmailReply(email, existingTicketId) {
        try {
            const { textBody, htmlBody, attachments = [], from } = email;
            const senderEmail = EmailParser.extractEmailAddress(from);

            // Extract content from email
            const content = EmailParser.cleanupEmailContent(
                textBody || EmailParser.convertHtmlToText(htmlBody)
            );

            // Add the reply as a comment
            const commentsRef = ref(database, `tickets/${existingTicketId}/comments`);
            await push(commentsRef, {
                content: content,
                user: EmailParser.extractSenderName(from),
                userEmail: senderEmail,
                timestamp: new Date().toISOString(),
                source: 'email-reply'
            });

            // Update the ticket's last updated timestamp
            const ticketRef = ref(database, `tickets/${existingTicketId}`);
            await update(ticketRef, {
                lastUpdated: new Date().toISOString()
            });

            // Process any attachments in the reply
            if (attachments && attachments.length > 0) {
                // Extract any inline images if HTML content is available
                const inlineImages = htmlBody ? EmailAttachmentService.extractInlineImages(htmlBody) : [];
                const allAttachments = [...attachments, ...inlineImages];

                await EmailAttachmentService.processEmailAttachments(
                    existingTicketId,
                    allAttachments,
                    senderEmail
                );
            }

            return {
                success: true,
                ticketId: existingTicketId,
                message: 'Reply added to ticket'
            };
        } catch (error) {
            console.error('Error processing email reply:', error);
            return {
                success: false,
                error: error.message
            };
        }
    },

    /**
     * Generate a unique ticket ID
     * @returns {Promise<string>} - Generated ticket ID
     */
    async generateTicketId() {
        // Get the current date in YYYYMMDD format
        const now = new Date();
        const dateStr = now.getFullYear() +
            String(now.getMonth() + 1).padStart(2, '0') +
            String(now.getDate()).padStart(2, '0');

        // Get the current counter for today
        const counterRef = ref(database, 'ticketCounter');
        const snapshot = await get(counterRef);
        let counter = 1;

        if (snapshot.exists()) {
            const data = snapshot.val();
            if (data.date === dateStr) {
                counter = (data.counter || 0) + 1;
            }
        }

        // Update the counter
        await update(counterRef, {
            date: dateStr,
            counter: counter
        });

        // Format: SMC-YYYYMMDD-XXX (e.g., SMC-20220315-001)
        return `SMC-${dateStr}-${String(counter).padStart(3, '0')}`;
    }
};

export default EmailTicketHandler;