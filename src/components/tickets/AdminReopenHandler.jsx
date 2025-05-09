// src/components/tickets/AdminReopenHandler.jsx
import React, { useState } from 'react';
import { ref, update, push } from 'firebase/database';
import { database } from '@/config/firebase';
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { AlertCircle, CheckCircle } from 'lucide-react';
import { useAuth } from '@/components/auth/AuthProvider';

/**
 * Component for handling admin reopening of tickets
 * This provides a more robust way to reopen tickets as an admin
 */
const AdminReopenHandler = ({ ticket, onSuccess, className }) => {
    const { toast } = useToast();
    const { user, userRole } = useAuth();
    const [isProcessing, setIsProcessing] = useState(false);

    // More comprehensive admin check function
    const isUserAdmin = () => {
        // Check multiple sources of admin status
        const isAdmin =
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
            ));

        console.log('Admin check:', {
            userRole,
            email: user?.email,
            isAdmin
        });

        return isAdmin;
    };

    const handleReopen = async () => {
        // Early return if not admin
        if (!isUserAdmin()) {
            toast({
                title: "Permission Denied",
                description: "Only administrators can reopen tickets",
                variant: "destructive"
            });
            return;
        }

        setIsProcessing(true);

        try {
            console.log('Reopening ticket:', ticket.id);

            // Create update object
            const updates = {
                status: 'in-progress',
                completedAt: null,
                reopenedAt: new Date().toISOString(),
                reopenedBy: user?.uid || 'admin-user',
                lastUpdated: new Date().toISOString(),
                // Reset any existing reopen request flags
                reopenRequested: false,
                reopenRequestedAt: null,
                // Flag to prevent duplicate notifications
                skipEmailNotification: true
            };

            console.log('Update data:', updates);

            // Update the ticket
            const ticketRef = ref(database, `tickets/${ticket.id}`);
            await update(ticketRef, updates);

            // Add a system comment
            const commentsRef = ref(database, `tickets/${ticket.id}/comments`);
            await push(commentsRef, {
                content: "Ticket reopened by administrator",
                user: 'System',
                userEmail: 'system@maintenance.app',
                timestamp: new Date().toISOString(),
                isSystemComment: true
            });

            // Show success toast
            toast({
                title: "Ticket Reopened",
                description: "The ticket has been successfully reopened",
                variant: "success"
            });

            // Call the success callback
            if (onSuccess) {
                onSuccess();
            }
        } catch (error) {
            console.error('Error reopening ticket:', error);

            toast({
                title: "Reopening Failed",
                description: "There was an error reopening the ticket. Please try again.",
                variant: "destructive"
            });
        } finally {
            setIsProcessing(false);
        }
    };

    // Don't render anything if not an admin
    if (!isUserAdmin()) {
        return null;
    }

    return (
        <div className={`${className} ${isProcessing ? 'opacity-50' : ''}`}>
            <Button
                onClick={handleReopen}
                disabled={isProcessing}
                className="w-full bg-green-600 hover:bg-green-700 text-white flex items-center justify-center gap-2"
            >
                {isProcessing ? (
                    <>
                        <AlertCircle className="h-4 w-4 animate-pulse" />
                        Processing...
                    </>
                ) : (
                    <>
                        <CheckCircle className="h-4 w-4" />
                        Reopen Ticket (Admin)
                    </>
                )}
            </Button>
        </div>
    );
};

export default AdminReopenHandler;