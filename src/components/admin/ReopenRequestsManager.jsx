// src/components/admin/ReopenRequestsManager.jsx
import React, { useState, useEffect } from 'react';
import { ref, onValue, update, push } from 'firebase/database';
import { database } from '@/config/firebase';
import { useAuth } from '@/components/auth/AuthProvider';
import { format } from 'date-fns';
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
    AlertCircle,
    CheckCircle,
    Clock,
    RotateCcw,
    Loader2,
    X,
    Calendar,
    User
} from 'lucide-react';
import { useToast } from "@/components/ui/use-toast";

const ReopenRequestsManager = () => {
    const [reopenRequests, setReopenRequests] = useState([]);
    const [loading, setLoading] = useState(true);
    const [processingTickets, setProcessingTickets] = useState({});
    const { user } = useAuth();
    const { toast } = useToast();

    useEffect(() => {
        // Fetch tickets with reopen requests
        const ticketsRef = ref(database, 'tickets');
        const unsubscribe = onValue(ticketsRef, (snapshot) => {
            if (snapshot.exists()) {
                const ticketsData = Object.entries(snapshot.val())
                    .map(([id, ticket]) => ({
                        id,
                        ...ticket
                    }))
                    .filter(ticket => ticket.reopenRequested === true) // Only get tickets with reopen requests
                    .sort((a, b) => {
                        // Sort by request date, newest first
                        const dateA = a.reopenRequestedAt ? new Date(a.reopenRequestedAt) : new Date(0);
                        const dateB = b.reopenRequestedAt ? new Date(b.reopenRequestedAt) : new Date(0);
                        return dateB - dateA;
                    });

                setReopenRequests(ticketsData);
            } else {
                setReopenRequests([]);
            }
            setLoading(false);
        });

        return () => unsubscribe();
    }, []);

    const handleApproveReopen = async (ticket) => {
        // Set processing state for this ticket
        setProcessingTickets(prev => ({ ...prev, [ticket.id]: 'approving' }));

        try {
            console.log('Approving reopen for ticket:', ticket.id);

            // Update the ticket status
            const ticketRef = ref(database, `tickets/${ticket.id}`);
            const updates = {
                status: 'in-progress',
                completedAt: null,
                reopenRequested: false,
                reopenRequestedAt: null,
                reopenedAt: new Date().toISOString(),
                reopenedBy: user?.uid || 'admin-user',
                lastUpdated: new Date().toISOString(),
                // Flag to prevent duplicate notifications from Google Apps Script
                skipEmailNotification: true
            };

            // Update the ticket
            await update(ticketRef, updates);

            // Add a system comment
            const commentsRef = ref(database, `tickets/${ticket.id}/comments`);
            await push(commentsRef, {
                content: "Ticket reopening approved by administrator - ticket is now active again",
                user: 'System',
                userEmail: 'system@maintenance.app',
                timestamp: new Date().toISOString(),
                isSystemComment: true
            });

            // Show success message
            toast({
                title: "Reopen Approved",
                description: `Ticket ${ticket.ticketId} has been reopened successfully`,
                variant: "success"
            });

            // Remove from processing state (will also be removed from list on next data refresh)
            setProcessingTickets(prev => {
                const newState = { ...prev };
                delete newState[ticket.id];
                return newState;
            });
        } catch (error) {
            console.error('Error approving reopen:', error);

            toast({
                title: "Error",
                description: `Failed to reopen ticket: ${error.message}`,
                variant: "destructive"
            });

            // Remove from processing state
            setProcessingTickets(prev => {
                const newState = { ...prev };
                delete newState[ticket.id];
                return newState;
            });
        }
    };

    const handleRejectReopen = async (ticket) => {
        // Set processing state for this ticket
        setProcessingTickets(prev => ({ ...prev, [ticket.id]: 'rejecting' }));

        try {
            console.log('Rejecting reopen for ticket:', ticket.id);

            // Update the ticket to clear the reopen request but keep it completed
            const ticketRef = ref(database, `tickets/${ticket.id}`);
            const updates = {
                reopenRequested: false,
                reopenRequestedAt: null,
                reopenRejectedAt: new Date().toISOString(),
                reopenRejectedBy: user?.uid || 'admin-user',
                lastUpdated: new Date().toISOString()
            };

            // Update the ticket
            await update(ticketRef, updates);

            // Add a system comment
            const commentsRef = ref(database, `tickets/${ticket.id}/comments`);
            await push(commentsRef, {
                content: "Reopen request was declined by administrator - ticket remains closed",
                user: 'System',
                userEmail: 'system@maintenance.app',
                timestamp: new Date().toISOString(),
                isSystemComment: true
            });

            // Show success message
            toast({
                title: "Reopen Rejected",
                description: `Reopen request for ticket ${ticket.ticketId} has been rejected`,
                variant: "info"
            });

            // Remove from processing state (will also be removed from list on next data refresh)
            setProcessingTickets(prev => {
                const newState = { ...prev };
                delete newState[ticket.id];
                return newState;
            });
        } catch (error) {
            console.error('Error rejecting reopen:', error);

            toast({
                title: "Error",
                description: `Failed to reject reopen request: ${error.message}`,
                variant: "destructive"
            });

            // Remove from processing state
            setProcessingTickets(prev => {
                const newState = { ...prev };
                delete newState[ticket.id];
                return newState;
            });
        }
    };

    if (loading) {
        return (
            <div className="flex justify-center items-center h-64">
                <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
                <span className="ml-2 text-lg">Loading reopen requests...</span>
            </div>
        );
    }

    return (
        <div className="p-6">
            <h2 className="text-2xl font-bold mb-6">Ticket Reopen Requests</h2>

            {reopenRequests.length === 0 ? (
                <div className="bg-white p-8 text-center rounded-lg shadow-sm">
                    <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
                    <h3 className="text-lg font-medium mb-2">No Pending Reopen Requests</h3>
                    <p className="text-gray-500">
                        There are currently no tickets waiting to be reopened.
                    </p>
                </div>
            ) : (
                <div className="grid gap-6 grid-cols-1 lg:grid-cols-2 xl:grid-cols-3">
                    {reopenRequests.map(ticket => (
                        <Card key={ticket.id} className="overflow-hidden">
                            <CardHeader className="pb-3">
                                <div className="flex justify-between items-start">
                                    <div>
                                        <CardTitle className="text-lg">{ticket.ticketId}</CardTitle>
                                        <CardDescription>
                                            {ticket.reopenRequestedAt && (
                                                <span className="flex items-center mt-1">
                                                    <Clock className="h-4 w-4 mr-1" />
                                                    Requested {format(new Date(ticket.reopenRequestedAt), 'dd/MM/yyyy HH:mm')}
                                                </span>
                                            )}
                                        </CardDescription>
                                    </div>
                                    <Badge className="bg-yellow-100 text-yellow-800 border-yellow-200">
                                        Reopen Requested
                                    </Badge>
                                </div>
                            </CardHeader>

                            <CardContent className="pb-3">
                                <div className="space-y-4">
                                    <div>
                                        <h4 className="font-semibold">{ticket.subject}</h4>
                                        <p className="text-sm text-gray-600 mt-1 line-clamp-2">{ticket.description}</p>
                                    </div>

                                    <div className="grid grid-cols-2 gap-2 text-sm">
                                        <div className="flex items-center">
                                            <User className="h-4 w-4 mr-1 text-gray-500" />
                                            <span>
                                                {typeof ticket.requester === 'object'
                                                    ? ticket.requester.name || ticket.requester.email
                                                    : ticket.requester}
                                            </span>
                                        </div>

                                        <div className="flex items-center">
                                            <Calendar className="h-4 w-4 mr-1 text-gray-500" />
                                            <span>
                                                {ticket.completedAt
                                                    ? `Closed: ${format(new Date(ticket.completedAt), 'dd/MM/yyyy')}`
                                                    : 'Not completed'}
                                            </span>
                                        </div>
                                    </div>

                                    <div className="flex justify-between gap-2 pt-2">
                                        <Button
                                            variant="outline"
                                            className="flex-1 border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700"
                                            onClick={() => handleRejectReopen(ticket)}
                                            disabled={!!processingTickets[ticket.id]}
                                        >
                                            {processingTickets[ticket.id] === 'rejecting' ? (
                                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                            ) : (
                                                <X className="h-4 w-4 mr-2" />
                                            )}
                                            Reject
                                        </Button>

                                        <Button
                                            className="flex-1 bg-green-600 hover:bg-green-700 text-white"
                                            onClick={() => handleApproveReopen(ticket)}
                                            disabled={!!processingTickets[ticket.id]}
                                        >
                                            {processingTickets[ticket.id] === 'approving' ? (
                                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                            ) : (
                                                <RotateCcw className="h-4 w-4 mr-2" />
                                            )}
                                            Reopen Ticket
                                        </Button>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}
        </div>
    );
};

export default ReopenRequestsManager;