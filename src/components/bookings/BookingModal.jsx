// src/components/bookings/BookingModal.jsx
//
// The request form. Deliberately short: asset, when, why. Opens pre-filled from
// whichever slot the teacher tapped on the calendar.

import React, { useState, useEffect } from 'react';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Loader, ShieldCheck, Zap, AlertTriangle } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { useAuth } from '../auth/AuthProvider';
import { createBooking, SlotConflictError } from './bookingService';
import { toDateInputValue, toTimeInputValue, fromDateTimeInputs, formatRange } from './bookingUtils';

const BookingModal = ({ open, onOpenChange, asset, initialStart, initialEnd, onBooked }) => {
    const { user } = useAuth();
    const { toast } = useToast();

    const [dateStr, setDateStr] = useState('');
    const [endDateStr, setEndDateStr] = useState('');
    const [startStr, setStartStr] = useState('');
    const [endStr, setEndStr] = useState('');
    const [multiDay, setMultiDay] = useState(false);
    const [reason, setReason] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState('');

    // Re-seed the form each time the modal opens on a new slot.
    useEffect(() => {
        if (!open || !initialStart) return;
        const end = initialEnd || initialStart + 30 * 60 * 1000;
        setDateStr(toDateInputValue(initialStart));
        setEndDateStr(toDateInputValue(end));
        setStartStr(toTimeInputValue(initialStart));
        setEndStr(toTimeInputValue(end));
        setMultiDay(false);
        setReason('');
        setError('');
    }, [open, initialStart, initialEnd]);

    if (!asset) return null;

    const needsSignOff = asset.approvalMode === 'signoff';

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');

        if (!dateStr || !startStr || !endStr) {
            setError('Please choose a date, a start time and an end time.');
            return;
        }
        if (!reason.trim()) {
            setError('Please give a short reason - it helps whoever else wants this asset.');
            return;
        }

        const start = fromDateTimeInputs(dateStr, startStr).getTime();
        const end = fromDateTimeInputs(multiDay ? endDateStr : dateStr, endStr).getTime();

        if (!(end > start)) {
            setError(
                multiDay
                    ? 'The booking must end after it starts.'
                    : 'The end time must be after the start time. For an overnight or multi-day booking, tick "runs over more than one day".'
            );
            return;
        }

        setSubmitting(true);
        try {
            const booking = await createBooking({ asset, start, end, reason: reason.trim(), user });

            toast({
                title: booking.status === 'confirmed' ? 'Booked' : 'Request sent',
                description: booking.status === 'confirmed'
                    ? `${asset.name} is yours for ${formatRange(start, end)}.`
                    : `${asset.name} is held for you pending sign-off.`,
                variant: 'success'
            });

            onOpenChange(false);
            if (onBooked) onBooked(booking);
        } catch (err) {
            console.error('Booking failed:', err);
            setError(
                err instanceof SlotConflictError
                    ? err.message
                    : err.message || 'Could not create the booking. Please try again.'
            );
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[480px] p-5 max-h-[90vh] overflow-y-auto">
                <DialogHeader className="mb-2">
                    <DialogTitle>Book {asset.name}</DialogTitle>
                    <DialogDescription>
                        {needsSignOff
                            ? 'This asset needs sign-off. Your slot is held while it waits for approval.'
                            : 'This asset is booked instantly as long as it is free.'}
                    </DialogDescription>
                </DialogHeader>

                <div className={`flex items-start gap-2 rounded-md p-3 text-sm mb-2 ${needsSignOff ? 'bg-amber-50 text-amber-800' : 'bg-emerald-50 text-emerald-800'}`}>
                    {needsSignOff ? <ShieldCheck className="h-4 w-4 mt-0.5 shrink-0" /> : <Zap className="h-4 w-4 mt-0.5 shrink-0" />}
                    <span>{needsSignOff ? 'Needs approval before it is confirmed' : 'Confirmed immediately'}</span>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-2">
                        <label className="text-sm font-medium" htmlFor="booking-date">Date</label>
                        <Input
                            id="booking-date"
                            type="date"
                            value={dateStr}
                            onChange={(e) => setDateStr(e.target.value)}
                            required
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-2">
                            <label className="text-sm font-medium" htmlFor="booking-start">From</label>
                            <Input
                                id="booking-start"
                                type="time"
                                step="900"
                                value={startStr}
                                onChange={(e) => setStartStr(e.target.value)}
                                required
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium" htmlFor="booking-end">Until</label>
                            <Input
                                id="booking-end"
                                type="time"
                                step="900"
                                value={endStr}
                                onChange={(e) => setEndStr(e.target.value)}
                                required
                            />
                        </div>
                    </div>

                    {/* Sports tours and weekend trips need a vehicle for more than a day. */}
                    <label className="flex items-center gap-2 text-sm text-gray-600">
                        <input
                            type="checkbox"
                            checked={multiDay}
                            onChange={(e) => setMultiDay(e.target.checked)}
                            className="h-4 w-4"
                        />
                        Runs over more than one day
                    </label>

                    {multiDay && (
                        <div className="space-y-2">
                            <label className="text-sm font-medium" htmlFor="booking-end-date">Ends on</label>
                            <Input
                                id="booking-end-date"
                                type="date"
                                value={endDateStr}
                                min={dateStr}
                                onChange={(e) => setEndDateStr(e.target.value)}
                            />
                        </div>
                    )}

                    <div className="space-y-2">
                        <label className="text-sm font-medium" htmlFor="booking-reason">Reason</label>
                        <Textarea
                            id="booking-reason"
                            placeholder="e.g. Grade 9 field trip to the aquarium"
                            value={reason}
                            onChange={(e) => setReason(e.target.value)}
                            rows={3}
                            required
                        />
                    </div>

                    {error && (
                        <div className="flex items-start gap-2 rounded-md bg-red-50 p-3 text-sm text-red-700">
                            <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
                            <span>{error}</span>
                        </div>
                    )}

                    <div className="flex justify-end gap-2 pt-2">
                        <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
                            Cancel
                        </Button>
                        <Button type="submit" disabled={submitting}>
                            {submitting && <Loader className="h-4 w-4 mr-2 animate-spin" />}
                            {needsSignOff ? 'Request booking' : 'Book it'}
                        </Button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    );
};

export default BookingModal;
