// src/components/bookings/ApprovalsQueue.jsx
//
// Where the Estate Manager and the Heads of Extramurals work. Lists every
// booking waiting on sign-off, and lets an approver confirm or decline with an
// optional note. Overrides on already-decided bookings are possible too, and
// every decision is stamped with who made it and when.

import React, { useState, useMemo } from 'react';
import { Loader, ShieldCheck, Inbox, History } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { useToast } from '@/components/ui/use-toast';
import { useAuth } from '../auth/AuthProvider';
import { useAllBookings, useAssets, useGlobalApprovers } from './useBookingData';
import { approveBooking, declineBooking, canApprove } from './bookingService';
import { formatRange } from './bookingUtils';
import BookingStatusBadge from './BookingStatusBadge';

const ApprovalsQueue = () => {
    const { user, isDatabaseAdmin } = useAuth();
    const { bookings, loading } = useAllBookings();
    const { assets } = useAssets();
    const { approvers: globalApprovers } = useGlobalApprovers();
    const { toast } = useToast();

    const [notes, setNotes] = useState({});
    const [busyId, setBusyId] = useState(null);
    const [showDecided, setShowDecided] = useState(false);

    const assetById = useMemo(
        () => Object.fromEntries(assets.map((a) => [a.id, a])),
        [assets]
    );

    const mayApprove = (booking) =>
        canApprove({
            uid: user?.uid,
            isDatabaseAdmin,
            asset: assetById[booking.assetId],
            globalApprovers
        });

    const pending = useMemo(
        () => bookings.filter((b) => b.status === 'pending' && mayApprove(b)).sort((a, b) => a.start - b.start),
        [bookings, assetById, globalApprovers, isDatabaseAdmin, user]
    );

    // Blanket override: an approver can revisit a booking that was already decided.
    const decided = useMemo(
        () => bookings
            .filter((b) => ['confirmed', 'declined'].includes(b.status) && b.end > Date.now() && mayApprove(b))
            .sort((a, b) => a.start - b.start),
        [bookings, assetById, globalApprovers, isDatabaseAdmin, user]
    );

    const act = async (booking, action) => {
        setBusyId(booking.id);
        try {
            const note = (notes[booking.id] || '').trim();
            if (action === 'approve') {
                await approveBooking({ booking, user, note });
                toast({ title: 'Approved', description: `${booking.assetName} confirmed.`, variant: 'success' });
            } else {
                await declineBooking({ booking, user, note });
                toast({ title: 'Declined', description: `${booking.assetName} released.`, variant: 'success' });
            }
            setNotes((prev) => ({ ...prev, [booking.id]: '' }));
        } catch (error) {
            console.error(`Could not ${action} booking:`, error);
            toast({ title: 'Error', description: error.message, variant: 'destructive' });
        } finally {
            setBusyId(null);
        }
    };

    if (loading) {
        return (
            <div className="flex h-64 items-center justify-center">
                <Loader className="h-8 w-8 animate-spin text-blue-500" />
                <span className="ml-2">Loading approvals...</span>
            </div>
        );
    }

    const renderCard = (booking, { isOverride }) => (
        <Card key={booking.id}>
            <CardContent className="space-y-3 p-4">
                <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="min-w-0">
                        <p className="font-semibold">{booking.assetName}</p>
                        <p className="text-sm text-gray-600">{formatRange(booking.start, booking.end)}</p>
                    </div>
                    <BookingStatusBadge status={booking.status} />
                </div>

                <p className="text-sm">
                    <span className="text-gray-500">Requested by </span>
                    {booking.requester?.name || 'Unknown'}
                </p>
                {booking.reason && <p className="text-sm text-gray-700">{booking.reason}</p>}

                {booking.decision && (
                    <p className="text-xs text-gray-500">
                        {booking.decision.action} by {booking.decision.byName || booking.decision.byEmail}
                        {' on '}
                        {new Date(booking.decision.at).toLocaleString('en-ZA')}
                        {booking.decision.note && ` - "${booking.decision.note}"`}
                    </p>
                )}

                <Textarea
                    placeholder={isOverride ? 'Reason for overriding (recommended)' : 'Optional note to the requester'}
                    rows={2}
                    value={notes[booking.id] || ''}
                    onChange={(e) => setNotes((prev) => ({ ...prev, [booking.id]: e.target.value }))}
                />

                <div className="flex flex-wrap gap-2">
                    {booking.status !== 'confirmed' && (
                        <Button
                            onClick={() => act(booking, 'approve')}
                            disabled={busyId === booking.id}
                            className="bg-emerald-600 hover:bg-emerald-700"
                        >
                            {busyId === booking.id && <Loader className="mr-2 h-4 w-4 animate-spin" />}
                            {isOverride ? 'Override to approved' : 'Approve'}
                        </Button>
                    )}
                    {booking.status !== 'declined' && (
                        <Button
                            variant="outline"
                            onClick={() => act(booking, 'decline')}
                            disabled={busyId === booking.id}
                            className="border-red-200 text-red-700 hover:bg-red-50"
                        >
                            {isOverride ? 'Override to declined' : 'Decline'}
                        </Button>
                    )}
                </div>
            </CardContent>
        </Card>
    );

    return (
        <div className="mx-auto max-w-3xl space-y-6">
            <div className="flex items-center gap-2">
                <ShieldCheck className="h-6 w-6 text-marist" />
                <h1 className="text-2xl font-bold">Approvals</h1>
            </div>

            {pending.length === 0 ? (
                <div className="rounded-lg border bg-gray-50 p-8 text-center">
                    <Inbox className="mx-auto mb-2 h-12 w-12 text-gray-400" />
                    <p className="text-gray-500">Nothing waiting for sign-off.</p>
                </div>
            ) : (
                <div className="space-y-4">
                    {pending.map((b) => renderCard(b, { isOverride: false }))}
                </div>
            )}

            {decided.length > 0 && (
                <div className="space-y-4">
                    <button
                        onClick={() => setShowDecided((v) => !v)}
                        className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900"
                    >
                        <History className="h-4 w-4" />
                        {showDecided ? 'Hide' : 'Show'} upcoming decided bookings ({decided.length})
                    </button>
                    {showDecided && (
                        <>
                            <p className="text-xs text-gray-500">
                                You can overrule any of these - for example when a booking clashes with an
                                extramural fixture. The override is recorded against the booking.
                            </p>
                            {decided.map((b) => renderCard(b, { isOverride: true }))}
                        </>
                    )}
                </div>
            )}
        </div>
    );
};

export default ApprovalsQueue;
