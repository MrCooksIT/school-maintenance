// src/components/bookings/MyBookings.jsx
//
// A teacher's own requests and their status. Upcoming first, history below.

import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Loader, CalendarPlus, CalendarX, Pencil } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription
} from '@/components/ui/dialog';
import { useToast } from '@/components/ui/use-toast';
import { useAuth } from '../auth/AuthProvider';
import { useMyBookings } from './useBookingData';
import { cancelBooking, updateBookingDetails } from './bookingService';
import { formatRange } from './bookingUtils';
import BookingStatusBadge from './BookingStatusBadge';

const MyBookings = () => {
    const { user } = useAuth();
    const { bookings, loading } = useMyBookings(user?.uid);
    const { toast } = useToast();
    const [busyId, setBusyId] = useState(null);
    const [editing, setEditing] = useState(null);
    const [editReason, setEditReason] = useState('');
    const [editError, setEditError] = useState('');
    const [saving, setSaving] = useState(false);

    const openEdit = (booking) => {
        setEditing(booking);
        setEditReason(booking.reason || '');
        setEditError('');
    };

    const saveEdit = async () => {
        setEditError('');
        if (!editReason.trim()) {
            setEditError('Please give a reason for the booking.');
            return;
        }
        setSaving(true);
        try {
            await updateBookingDetails({ booking: editing, reason: editReason, user });
            toast({ title: 'Booking updated', description: editing.assetName, variant: 'success' });
            setEditing(null);
        } catch (error) {
            console.error('Could not update booking:', error);
            setEditError(error.message || 'Could not save the change.');
        } finally {
            setSaving(false);
        }
    };

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
                        <div className="flex gap-2">
                            <Button variant="outline" onClick={() => openEdit(booking)}>
                                <Pencil className="mr-1 h-3.5 w-3.5" />
                                Edit details
                            </Button>
                            <Button
                                variant="outline"
                                onClick={() => handleCancel(booking)}
                                disabled={busyId === booking.id}
                                className="border-red-200 text-red-700 hover:bg-red-50"
                            >
                                {busyId === booking.id && <Loader className="mr-2 h-4 w-4 animate-spin" />}
                                Cancel
                            </Button>
                        </div>
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

            <Dialog open={!!editing} onOpenChange={(open) => !open && setEditing(null)}>
                <DialogContent className="p-6 sm:max-w-[460px]">
                    <DialogHeader className="mb-2">
                        <DialogTitle>Edit booking details</DialogTitle>
                        <DialogDescription>
                            {editing?.assetName}
                            {editing && ` - ${formatRange(editing.start, editing.end)}`}
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4">
                        <div className="space-y-2">
                            <label className="text-sm font-medium" htmlFor="edit-reason">Reason</label>
                            <Textarea
                                id="edit-reason"
                                rows={3}
                                value={editReason}
                                onChange={(e) => setEditReason(e.target.value)}
                            />
                        </div>

                        <p className="text-xs text-gray-500">
                            To change the date or time, cancel this booking and make a new one -
                            or ask the Estate Manager to move it for you.
                        </p>

                        {editError && (
                            <div className="rounded-md bg-red-50 p-3 text-sm text-red-700">{editError}</div>
                        )}
                    </div>

                    <div className="flex justify-end gap-2 pt-4">
                        <Button variant="outline" onClick={() => setEditing(null)} disabled={saving}>
                            Cancel
                        </Button>
                        <Button onClick={saveEdit} disabled={saving}>
                            {saving && <Loader className="mr-2 h-4 w-4 animate-spin" />}
                            Save changes
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
};

export default MyBookings;
