// src/services/emailAttachmentService.js
import { ref as storageRef, uploadBytes, getDownloadURL } from 'firebase/storage';
import { ref as dbRef, push } from 'firebase/database';
import { storage, database } from '@/config/firebase';

/**
 * Service to handle email attachments for maintenance tickets
 */
export const emailAttachmentService = {
    /**
     * Process and save email attachments to a ticket
     * @param {string} ticketId - The ID of the ticket
     * @param {Array} attachments - Array of file objects from email
     * @param {Object} emailMetadata - Email metadata (sender, date, etc.)
     * @returns {Promise<Array>} - Array of processed attachment references
     */
    async processEmailAttachments(ticketId, attachments, emailMetadata) {
        if (!ticketId || !attachments || attachments.length === 0) {
            return [];
        }

        const processedAttachments = [];

        for (const attachment of attachments) {
            try {
                // Generate a unique filename with timestamp
                const timestamp = new Date().getTime();
                const safeFileName = attachment.name.replace(/[^a-zA-Z0-9.-]/g, '_');
                const fileName = `${timestamp}_${safeFileName}`;
                const filePath = `tickets/${ticketId}/email_attachments/${fileName}`;

                // Upload file to Firebase Storage
                const fileRef = storageRef(storage, filePath);
                const snapshot = await uploadBytes(fileRef, attachment.data);
                const downloadURL = await getDownloadURL(snapshot.ref);

                // Add file metadata to the database
                const attachmentsRef = dbRef(database, `tickets/${ticketId}/attachments`);
                const newAttachment = await push(attachmentsRef, {
                    name: attachment.name,
                    type: attachment.type || this.detectMimeType(attachment.name),
                    size: attachment.size,
                    url: downloadURL,
                    path: filePath,
                    uploadedAt: new Date().toISOString(),
                    source: 'email',
                    emailData: {
                        sender: emailMetadata.sender,
                        subject: emailMetadata.subject,
                        receivedAt: emailMetadata.date,
                    }
                });

                processedAttachments.push({
                    id: newAttachment.key,
                    name: attachment.name,
                    url: downloadURL
                });
            } catch (error) {
                console.error(`Error processing email attachment: ${attachment.name}`, error);
            }
        }

        return processedAttachments;
    },

    /**
     * Detect MIME type from file extension
     * @param {string} filename - The filename to analyze
     * @returns {string} - The MIME type
     */
    detectMimeType(filename) {
        const extension = filename.split('.').pop().toLowerCase();

        const mimeTypes = {
            'jpg': 'image/jpeg',
            'jpeg': 'image/jpeg',
            'png': 'image/png',
            'gif': 'image/gif',
            'pdf': 'application/pdf',
            'doc': 'application/msword',
            'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            'xls': 'application/vnd.ms-excel',
            'xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'txt': 'text/plain',
            'csv': 'text/csv'
        };

        return mimeTypes[extension] || 'application/octet-stream';
    }
};

export default emailAttachmentService;