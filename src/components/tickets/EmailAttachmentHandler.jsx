// src/components/tickets/EmailAttachmentHandler.jsx
import React, { useState } from 'react';
import { ref, push, update } from 'firebase/database';
import { ref as storageRef, uploadBytes, getDownloadURL } from 'firebase/storage';
import { database, storage } from '@/config/firebase';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Textarea } from '../ui/textarea';
import {
    Card,
    CardContent,
    CardDescription,
    CardFooter,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { Loader2, Mail, PaperclipIcon } from 'lucide-react';
import { useToast } from "@/components/ui/use-toast";
import emailAttachmentService from '@/services/emailAttachmentService';

/**
 * Component to handle manual email attachment imports
 * This could be used in an admin interface to process emails
 * that were received outside of the system
 */
export function EmailAttachmentHandler({ ticketId, onAttachmentsProcessed }) {
    const [emailSubject, setEmailSubject] = useState('');
    const [emailSender, setEmailSender] = useState('');
    const [emailContent, setEmailContent] = useState('');
    const [attachments, setAttachments] = useState([]);
    const [isProcessing, setIsProcessing] = useState(false);
    const { toast } = useToast();

    const handleAttachmentChange = (e) => {
        if (e.target.files) {
            setAttachments(Array.from(e.target.files));
        }
    };

    const handleProcessEmail = async (e) => {
        e.preventDefault();

        if (!ticketId) {
            toast({
                title: "Error",
                description: "No ticket ID provided",
                variant: "destructive",
            });
            return;
        }

        if (attachments.length === 0) {
            toast({
                title: "Warning",
                description: "No attachments selected",
                variant: "warning",
            });
            return;
        }

        setIsProcessing(true);

        try {
            // Prepare attachment data
            const attachmentData = attachments.map(file => ({
                name: file.name,
                type: file.type,
                size: file.size,
                data: file
            }));

            // Process attachments
            const emailMetadata = {
                sender: emailSender,
                subject: emailSubject,
                date: new Date().toISOString()
            };

            await emailAttachmentService.processEmailAttachments(
                ticketId,
                attachmentData,
                emailMetadata
            );

            // Add a comment to the ticket about the email
            const commentsRef = ref(database, `tickets/${ticketId}/comments`);
            await push(commentsRef, {
                content: `Email received from ${emailSender}: "${emailSubject}"\n\n${emailContent}\n\n${attachments.length} attachment(s) added.`,
                user: 'Email System',
                userEmail: 'email-system@example.com',
                timestamp: new Date().toISOString(),
                isSystemComment: true
            });

            // Update the ticket's last activity
            const ticketRef = ref(database, `tickets/${ticketId}`);
            await update(ticketRef, {
                lastUpdated: new Date().toISOString(),
                hasEmailAttachments: true
            });

            toast({
                title: "Success",
                description: `${attachments.length} attachment(s) processed successfully`,
                variant: "success",
            });

            // Reset form
            setEmailSubject('');
            setEmailSender('');
            setEmailContent('');
            setAttachments([]);

            // Notify parent component
            if (onAttachmentsProcessed) {
                onAttachmentsProcessed();
            }
        } catch (error) {
            console.error('Error processing email attachments:', error);
            toast({
                title: "Error",
                description: "Failed to process email attachments",
                variant: "destructive",
            });
        } finally {
            setIsProcessing(false);
        }
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle>Process Email Attachments</CardTitle>
                <CardDescription>
                    Upload attachments from an email related to this ticket
                </CardDescription>
            </CardHeader>
            <CardContent>
                <form onSubmit={handleProcessEmail} className="space-y-4">
                    <div className="space-y-2">
                        <label className="text-sm font-medium">Email Sender</label>
                        <Input
                            placeholder="sender@example.com"
                            value={emailSender}
                            onChange={(e) => setEmailSender(e.target.value)}
                            required
                        />
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-medium">Email Subject</label>
                        <Input
                            placeholder="Email subject"
                            value={emailSubject}
                            onChange={(e) => setEmailSubject(e.target.value)}
                            required
                        />
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-medium">Email Content</label>
                        <Textarea
                            placeholder="Content of the email..."
                            value={emailContent}
                            onChange={(e) => setEmailContent(e.target.value)}
                            rows={4}
                        />
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-medium">Attachments</label>
                        <div className="flex items-center justify-center w-full">
                            <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-lg cursor-pointer hover:bg-gray-50">
                                <div className="flex flex-col items-center justify-center pt-5 pb-6">
                                    <PaperclipIcon className="w-8 h-8 mb-4 text-gray-500" />
                                    <p className="mb-2 text-sm text-gray-500">
                                        <span className="font-semibold">Click to select email attachments</span>
                                    </p>
                                    <p className="text-xs text-gray-500">
                                        Images, PDFs, or documents (MAX. 10MB each)
                                    </p>
                                </div>
                                <Input
                                    type="file"
                                    multiple
                                    className="hidden"
                                    onChange={handleAttachmentChange}
                                    disabled={isProcessing}
                                    accept="image/*,.pdf,.doc,.docx,.xls,.xlsx"
                                />
                            </label>
                        </div>
                        {attachments.length > 0 && (
                            <div className="mt-2">
                                <p className="text-sm font-medium">Selected files:</p>
                                <ul className="text-sm text-gray-500">
                                    {attachments.map((file, index) => (
                                        <li key={index} className="flex items-center gap-1 mt-1">
                                            <PaperclipIcon className="h-3 w-3" />
                                            {file.name} ({(file.size / 1024).toFixed(1)} KB)
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}
                    </div>
                </form>
            </CardContent>
            <CardFooter className="justify-end">
                <Button onClick={handleProcessEmail} disabled={isProcessing || !emailSender || !emailSubject || attachments.length === 0}>
                    {isProcessing ? (
                        <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            Processing...
                        </>
                    ) : (
                        <>
                            <Mail className="h-4 w-4 mr-2" />
                            Process Email Attachments
                        </>
                    )}
                </Button>
            </CardFooter>
        </Card>
    );
}

export default EmailAttachmentHandler;