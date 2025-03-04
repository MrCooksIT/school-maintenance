// src/services/EmailAttachmentService.js
import { ref as storageRef, uploadBytes, getDownloadURL } from 'firebase/storage';
import { ref as dbRef, push, update } from 'firebase/database';
import { storage, database } from '@/config/firebase';

/**
 * Service to handle email attachments for tickets
 */
export const EmailAttachmentService = {
    /**
     * Process attachments from an email and add them to a ticket
     * @param {string} ticketId - The ID of the ticket
     * @param {Array} attachments - Array of attachment objects from email
     * @param {string} senderEmail - Email of sender for tracking purposes
     * @returns {Promise<Array>} - Array of processed attachment objects
     */
    async processEmailAttachments(ticketId, attachments, senderEmail) {
        if (!ticketId || !attachments || !attachments.length) {
            return [];
        }

        const processedAttachments = [];

        for (const attachment of attachments) {
            try {
                // Skip non-image attachments if needed
                if (!attachment.contentType.startsWith('image/')) {
                    continue;
                }

                // Create a unique filename
                const timestamp = new Date().getTime();
                const fileName = `${timestamp}_${attachment.filename || 'email_attachment'}`;
                const filePath = `tickets/${ticketId}/email/${fileName}`;

                // Convert base64/attachment data to blob
                const response = await fetch(attachment.data);
                const blob = await response.blob();

                // Upload to Firebase Storage
                const fileRef = storageRef(storage, filePath);
                const snapshot = await uploadBytes(fileRef, blob);
                const downloadURL = await getDownloadURL(snapshot.ref);

                // Add file metadata to the database
                const filesRef = dbRef(database, `tickets/${ticketId}/attachments`);
                const newAttachmentRef = await push(filesRef, {
                    name: attachment.filename || 'Email Attachment',
                    type: attachment.contentType,
                    size: blob.size,
                    url: downloadURL,
                    path: filePath,
                    uploadedAt: new Date().toISOString(),
                    source: 'email',
                    senderEmail: senderEmail
                });

                // Add to processed attachments
                processedAttachments.push({
                    id: newAttachmentRef.key,
                    name: attachment.filename || 'Email Attachment',
                    url: downloadURL
                });
            } catch (error) {
                console.error('Error processing email attachment:', error);
            }
        }

        // Update ticket to indicate it has email attachments
        if (processedAttachments.length > 0) {
            const ticketRef = dbRef(database, `tickets/${ticketId}`);
            await update(ticketRef, {
                hasEmailAttachments: true,
                lastUpdated: new Date().toISOString()
            });
        }

        return processedAttachments;
    },

    /**
     * Parse email content to extract inline images
     * @param {string} emailHtml - HTML content of the email
     * @returns {Array} - Array of attachment objects
     */
    extractInlineImages(emailHtml) {
        // This is a simplified implementation - production code would need
        // to handle various email formats and extract embedded images
        const attachments = [];

        // Simple regex to find base64 encoded images in HTML
        const imgRegex = /<img[^>]+src="data:image\/([^;]+);base64,([^"]+)"/g;
        let match;

        while ((match = imgRegex.exec(emailHtml)) !== null) {
            const contentType = `image/${match[1]}`;
            const base64Data = match[2];
            const dataUrl = `data:${contentType};base64,${base64Data}`;

            attachments.push({
                filename: `inline_image_${attachments.length + 1}.${match[1]}`,
                contentType: contentType,
                data: dataUrl
            });
        }

        return attachments;
    }
};

export default EmailAttachmentService;