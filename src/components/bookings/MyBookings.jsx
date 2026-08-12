// src/components/bookings/MyBookings.jsx
//
// A teacher's own requests and their status. Upcoming first, history below.

import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Loader, CalendarPlus, CalendarX } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useToast } from '@/components/ui/use-toast';
import { useAuth } from '../auth/AuthProvider';
import { useMyBookings } from './useBookingData';
import { cancelBooking } from './bookingService';
import { formatRange } from './bookingUtils';
import BookingStatusBadge from './BookingStatusBadge';

const MyBookings = () => {
    const { user } = useAuth();
    const { bookings, loading } = useMyBookings(user?.uid);
    const { toast } = useToast();
    const [busyId, setBusyId] = useState(null);

    const { upcoming, past } = useMemo(() => {
        const now = Date.now();
        return {
            upcoming: bookings
                .filter((b) => b.end >= now && ['pending', 'confirmed'].includes(b.status))
                .sort((a, b) => a.start - b.start),
            past: bookings
                .filter((b) => b.end < now || ['declined', 'cancelled'].includes(b.status))
                .sort((a, b) => b.start - a.start)
        };
    }, [bookings]);

    const handleCancel = async (booking) => {
        if (!window.confirm(`Cancel your booking of ${booking.assetName}?`)) return;
        setBusyId(booking.id);
        try {
            await cancelBooking({ booking, user });
            toast({ title: 'Cancelled', description: `${booking.assetName} is free again.`, variant: 'success' });
        } catch (error) {
            console.error('Could not cancel booking:', error);
            toast({ title: 'Error', description: error.message, variant: 'destructive' });
        } finally {
            setBusyId(null);
        }
    };

    if (loading) {
        return (
            <div className="flex h-64 items-center justify-center">
                <Loader className="h-8 w-8 animate-spin text-blue-500" />
                <span className="ml-2">Loading your requests...</span>
            </div>
        );
    }

    const renderBooking = (booking, { cancellable }) => (
        <Card key={booking.id}>
            <CardContent className="flex flex-wrap items-start justify-between gap-3 p-4">
                <div className="min-w-0 space-y-1">
                    <p className="font-semibold">{booking.assetName}</p>
                    <p className="text-sm text-gray-600">{formatRange(booking.start, booking.end)}</p>
                    {booking.reason && <p className="text-sm text-gray-500">{booking.reason}</p>}
                    {booking.decision?.note && (
                        <p className="text-sm text-gray-500">
                            Note from {booking.decision.byName || 'approver'}: &quot;{booking.decision.note}&quot;
                        </p>
                    )}
                    <p className="text-xs text-gray-400">
                        Requested {new Date(booking.createdAt).toLocaleString('en-ZA')}
                    </p>
                </div>
                <div className="flex shrink-0 flex-col items-end gap-2">
                    <BookingStatusBadge status={booking.status} />
                    {cancellable && (
                        <Button
                            variant="outline"
                            onClick={() => handleCancel(booking)}
                            disabled={busyId === booking.id}
                            className="border-red-200 text-red-700 hover:bg-red-50"
                        >
                            {busyId === booking.id && <Loader className="mr-2 h-4 w-4 animate-spin" />}
                            Cancel
                        </Button>
                    )}
                </div>
            </CardContent>
        </Card>
    );

    return (
        <div className="mx-auto max-w-3xl space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-2">
                <h1 className="text-2xl font-bold">My bookings</h1>
                <Link to="/bookings">
                    <Button>
                        <CalendarPlus className="mr-2 h-4 w-4" />
                        Book something
                    </Button>
                </Link>
            </div>

            <section className="space-y-3">
                <h2 className="text-sm font-medium uppercase tracking-wide text-gray-500">Upcoming</h2>
                {upcoming.length === 0 ? (
                    <div className="rounded-lg border bg-gray-50 p-8 text-center">
                        <CalendarX className="mx-auto mb-2 h-10 w-10 text-gray-400" />
                        <p className="text-gray-500">You have no upcoming bookings.</p>
                    </div>
                ) : (
                    upcoming.map((b) => renderBooking(b, { cancellable: true }))
                )}
            </section>

            {past.length > 0 && (
                <section className="space-y-3">
                    <h2 className="text-sm font-medium uppercase tracking-wide text-gray-500">History</h2>
                    {past.slice(0, 25).map((b) => renderBooking(b, { cancellable: false }))}
                </section>
            )}
        </div>
    );
};

export default MyBookings;
