// src/components/bookings/ApproversManager.jsx
//
// Who can sign off bookings anywhere in the system - the Estate Manager and the
// two Heads of Extramurals. Stored in bookingApprovers/{uid}, so changing who
// holds the role never needs a code change.

import React from 'react';
import { ref, update } from 'firebase/database';
import { database } from '@/config/firebase';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Loader, ShieldCheck } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { useUsers, useGlobalApprovers } from './useBookingData';

const ApproversManager = () => {
    const { users, loading: usersLoading } = useUsers();
    const { approvers, loading: approversLoading } = useGlobalApprovers();
    const { toast } = useToast();

    const toggle = async (user) => {
        const isApprover = !!approvers[user.id];
        try {
            await update(ref(database, 'bookingApprovers'), {
                [user.id]: isApprover ? null : true
            });
            toast({
                title: isApprover ? 'Approver removed' : 'Approver added',
                description: `${user.name || user.email} ${isApprover ? 'can no longer' : 'can now'} sign off bookings.`,
                variant: 'success'
            });
        } catch (error) {
            console.error('Could not update approvers:', error);
            toast({ title: 'Error', description: error.message, variant: 'destructive' });
        }
    };

    if (usersLoading || approversLoading) {
        return (
            <div className="flex h-64 items-center justify-center">
                <Loader className="h-8 w-8 animate-spin text-blue-500" />
                <span className="ml-2">Loading...</span>
            </div>
        );
    }

    return (
        <div className="mx-auto max-w-2xl space-y-5">
            <div className="flex items-center gap-2">
                <ShieldCheck className="h-6 w-6 text-marist" />
                <h1 className="text-2xl font-bold">Booking approvers</h1>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Global approvers</CardTitle>
                    <CardDescription>
                        These people can approve, decline or overrule any booking on any
                        sign-off asset. Every decision is recorded against the booking.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {users.length === 0 ? (
                        <p className="py-4 text-sm text-gray-500">
                            Nobody has signed in yet. People appear here once they have logged in at least once.
                        </p>
                    ) : (
                        <div className="divide-y">
                            {users.map((user) => (
                                <label
                                    key={user.id}
                                    className="flex cursor-pointer items-center justify-between gap-3 py-3"
                                >
                                    <div className="min-w-0">
                                        <p className="truncate text-sm font-medium">{user.name || user.email}</p>
                                        <p className="truncate text-xs text-gray-500">{user.email}</p>
                                    </div>
                                    <input
                                        type="checkbox"
                                        checked={!!approvers[user.id]}
                                        onChange={() => toggle(user)}
                                        className="h-5 w-5 shrink-0"
                                    />
                                </label>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>

            <p className="text-xs text-gray-500">
                Approvers for one specific asset are set on that asset, under Bookable assets.
            </p>
        </div>
    );
};

export default ApproversManager;
