// src/services/EmailParser.js
import { EmailAttachmentService } from '/EmailAttachmentService';

/**
 * Service to parse emails and extract ticket information and attachments
 */
export const EmailParser = {
    /**
     * Parse an incoming email and create/update a ticket
     * @param {Object} email - Email object containing headers, body, attachments
     * @returns {Object} - Parsed ticket data including attachments
     */
    parseEmailToTicket(email) {
        // Extract basic email information
        const {
            from,
            subject,
            textBody,
            htmlBody,
            attachments = [],
            date = new Date()
        } = email;

        // Extract sender information
        const senderEmail = this.extractEmailAddress(from);
        const senderName = this.extractSenderName(from);

        // Parse subject line for ticket data like priority, location, etc.
        const parsedSubject = this.parseSubject(subject);

        // Combine body text and extract any potential ticket metadata
        const description = this.cleanupEmailContent(textBody || this.convertHtmlToText(htmlBody));

        // Extract any inline images from HTML content
        const inlineImages = htmlBody ? EmailAttachmentService.extractInlineImages(htmlBody) : [];

        // Combine inline images with regular attachments
        const allAttachments = [...attachments, ...inlineImages];

        // Create ticket data object
        const ticketData = {
            subject: parsedSubject.subject,
            description: description,
            priority: parsedSubject.priority || 'medium',
            location: parsedSubject.location,
            requester: {
                name: senderName,
                email: senderEmail
            },
            status: 'new',
            createdAt: date.toISOString(),
            source: 'email',
            hasAttachments: allAttachments.length > 0,
            attachmentCount: allAttachments.length
        };

        return {
            ticketData,
            attachments: allAttachments,
            senderEmail
        };
    },

    /**
     * Extract the email address from a formatted email string
     * @param {string} from - Email header ("Name <email@example.com>")
     * @returns {string} - Email address
     */
    extractEmailAddress(from) {
        const emailMatch = from.match(/<(.+?)>/) || from.match(/([a-zA-Z0-9._-]+@[a-zA-Z0-9._-]+\.[a-zA-Z0-9_-]+)/);
        return emailMatch ? emailMatch[1] : from;
    },

    /**
     * Extract the sender name from a formatted email string
     * @param {string} from - Email header ("Name <email@example.com>")
     * @returns {string} - Sender name
     */
    extractSenderName(from) {
        const nameMatch = from.match(/^"?([^"<]+)"?\s*</) || from.match(/^([^<]+)</);
        return nameMatch ? nameMatch[1].trim() : 'Unknown Sender';
    },

    /**
     * Parse the subject line for ticket metadata
     * @param {string} subject - Email subject line
     * @returns {Object} - Extracted metadata including cleaned subject
     */
    parseSubject(subject) {
        // Initialize result object
        const result = {
            subject: subject,
            priority: null,
            location: null
        };

        // Extract priority if present in brackets like [High]
        const priorityMatch = subject.match(/\[(high|medium|low)\]/i);
        if (priorityMatch) {
            result.priority = priorityMatch[1].toLowerCase();
            // Remove the priority tag from subject
            result.subject = result.subject.replace(priorityMatch[0], '').trim();
        }

        // Extract location if present in format (Location)
        const locationMatch = subject.match(/\(([^)]+)\)/);
        if (locationMatch) {
            result.location = locationMatch[1].trim();
            // Remove the location tag from subject
            result.subject = result.subject.replace(locationMatch[0], '').trim();
        }

        return result;
    },

    /**
     * Clean up email content by removing signatures, quoted replies, etc.
     * @param {string} content - Email body content
     * @returns {string} - Cleaned content
     */
    cleanupEmailContent(content) {
        if (!content) return '';

        // Remove email signature (simplified)
        let cleaned = content.split(/^--\s*$/m)[0];

        // Remove quoted replies
        cleaned = cleaned.replace(/^>.*$/gm, '');

        // Remove extra whitespace
        cleaned = cleaned.replace(/\n{3,}/g, '\n\n').trim();

        return cleaned;
    },

    /**
     * Convert HTML content to plain text (simplified)
     * @param {string} html - HTML content
     * @returns {string} - Plain text
     */
    convertHtmlToText(html) {
        if (!html) return '';

        // This is a simplified version - in production use a proper HTML-to-text library
        return html
            .replace(/<[^>]*>/g, ' ') // Remove HTML tags
            .replace(/\s+/g, ' ')     // Normalize whitespace
            .trim();
    }
};

export default EmailParser;