// src/components/bookings/BookingsDashboard.jsx
//
// The admin overview: every booking across every asset - who booked what, for
// when, when they asked, and where it stands. Plus the amend and cancel controls.

import React, { useMemo, useState } from 'react';
import { Loader, Search, CalendarClock, Pencil } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/components/ui/use-toast';
import { useAuth } from '../auth/AuthProvider';
import { useAllBookings, useAssets } from './useBookingData';
import { cancelBooking, amendBooking, updateBookingDetails, SlotConflictError } from './bookingService';
import {
    formatRange,
    toDateInputValue,
    toTimeInputValue,
    fromDateTimeInputs
} from './bookingUtils';
import BookingStatusBadge from './BookingStatusBadge';

const STATUS_FILTERS = ['all', 'pending', 'confirmed', 'declined', 'cancelled'];

const BookingsDashboard = () => {
    const { user } = useAuth();
    const { bookings, loading } = useAllBookings();
    const { assets } = useAssets();
    const { toast } = useToast();

    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [assetFilter, setAssetFilter] = useState('all');
    const [busyId, setBusyId] = useState(null);

    const [amending, setAmending] = useState(null);
    const [amendDate, setAmendDate] = useState('');
    const [amendEndDate, setAmendEndDate] = useState('');
    const [amendStart, setAmendStart] = useState('');
    const [amendEnd, setAmendEnd] = useState('');
    const [amendNote, setAmendNote] = useState('');
    const [amendReason, setAmendReason] = useState('');
    const [amendError, setAmendError] = useState('');
    const [amendSaving, setAmendSaving] = useState(false);

    const filtered = useMemo(() => {
        const term = search.trim().toLowerCase();
        return bookings.filter((b) => {
            if (statusFilter !== 'all' && b.status !== statusFilter) return false;
            if (assetFilter !== 'all' && b.assetId !== assetFilter) return false;
            if (!term) return true;
            return [b.assetName, b.requester?.name, b.requester?.email, b.reason]
                .filter(Boolean)
                .some((v) => String(v).toLowerCase().includes(term));
        });
    }, [bookings, search, statusFilter, assetFilter]);

    const openAmend = (booking) => {
        setAmending(booking);
        setAmendDate(toDateInputValue(booking.start));
        // Kept separate so moving a multi-day booking does not collapse it to one day.
        setAmendEndDate(toDateInputValue(booking.end));
        setAmendStart(toTimeInputValue(booking.start));
        setAmendEnd(toTimeInputValue(booking.end));
        setAmendNote('');
        setAmendReason(booking.reason || '');
        setAmendError('');
    };

    const submitAmend = async () => {
        setAmendError('');
        const start = fromDateTimeInputs(amendDate, amendStart).getTime();
        const end = fromDateTimeInputs(amendEndDate || amendDate, amendEnd).getTime();

        if (!(end > start)) {
            setAmendError('The booking must end after it starts.');
            return;
        }

        setAmendSaving(true);
        try {
            const timeChanged = start !== amending.start || end !== amending.end;
            if (timeChanged) {
                await amendBooking({ booking: amending, start, end, user, note: amendNote.trim() });
            }
            if (amendReason.trim() !== (amending.reason || '')) {
                await updateBookingDetails({ booking: amending, reason: amendReason, user });
            }
            if (!timeChanged && amendReason.trim() === (amending.reason || '')) {
                setAmendError('Nothing changed.');
                return;
            }
            toast({ title: 'Booking updated', description: `${amending.assetName} updated.`, variant: 'success' });
            setAmending(null);
        } catch (error) {
            console.error('Could not amend booking:', error);
            setAmendError(
                error instanceof SlotConflictError
                    ? error.message
                    : error.message || 'Could not move the booking.'
            );
        } finally {
            setAmendSaving(false);
        }
    };

    const handleCancel = async (booking) => {
        if (!window.confirm(`Cancel ${booking.assetName} for ${booking.requester?.name}?`)) return;
        setBusyId(booking.id);
        try {
            await cancelBooking({ booking, user, note: 'Cancelled by an administrator' });
            toast({ title: 'Cancelled', description: `${booking.assetName} is free again.`, variant: 'success' });
        } catch (error) {
            toast({ title: 'Error', description: error.message, variant: 'destructive' });
        } finally {
            setBusyId(null);
        }
    };

    if (loading) {
        return (
            <div className="flex h-64 items-center justify-center">
                <Loader className="h-8 w-8 animate-spin text-blue-500" />
                <span className="ml-2">Loading bookings...</span>
            </div>
        );
    }

    const canModify = (b) => ['pending', 'confirmed'].includes(b.status);

    return (
        <div className="space-y-5">
            <div className="flex items-center gap-2">
                <CalendarClock className="h-6 w-6 text-marist" />
                <h1 className="text-2xl font-bold">All bookings</h1>
            </div>

            <div className="space-y-3">
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                    <Input
                        placeholder="Search by asset, person or reason"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="pl-9"
                    />
                </div>

                <div className="flex gap-2 overflow-x-auto pb-1">
                    {STATUS_FILTERS.map((s) => (
                        <button
                            key={s}
                            onClick={() => setStatusFilter(s)}
                            className={`whitespace-nowrap rounded-full px-3 py-1.5 text-sm capitalize ${statusFilter === s
                                ? 'bg-marist text-white'
                                : 'border bg-white text-gray-600 hover:bg-gray-50'
                                }`}
                        >
                            {s}
                        </button>
                    ))}
                </div>

                <select
                    value={assetFilter}
                    onChange={(e) => setAssetFilter(e.target.value)}
                    className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                >
                    <option value="all">All assets</option>
                    {assets.map((a) => (
                        <option key={a.id} value={a.id}>{a.name}</option>
                    ))}
                </select>
            </div>

            <p className="text-sm text-gray-500">
                {filtered.length} booking{filtered.length === 1 ? '' : 's'}
            </p>

            {/* Card list on phones, table on desktop */}
            <div className="space-y-3 md:hidden">
                {filtered.map((b) => (
                    <div key={b.id} className="space-y-2 rounded-lg border bg-white p-4">
                        <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                                <p className="truncate font-semibold">{b.assetName}</p>
                                <p className="text-sm text-gray-600">{formatRange(b.start, b.end)}</p>
                            </div>
                            <BookingStatusBadge status={b.status} />
                        </div>
                        <p className="text-sm">{b.requester?.name}</p>
                        {b.reason && <p className="text-sm text-gray-500">{b.reason}</p>}
                        <p className="text-xs text-gray-400">
                            Booked {new Date(b.createdAt).toLocaleString('en-ZA')}
                        </p>
                        {canModify(b) && (
                            <div className="flex gap-2 pt-1">
                                <Button variant="outline" onClick={() => openAmend(b)}>
                                    <Pencil className="mr-1 h-3.5 w-3.5" /> Move
                                </Button>
                                <Button
                                    variant="outline"
                                    onClick={() => handleCancel(b)}
                                    disabled={busyId === b.id}
                                    className="border-red-200 text-red-700 hover:bg-red-50"
                                >
                                    Cancel
                                </Button>
                            </div>
                        )}
                    </div>
                ))}
            </div>

            <div className="hidden overflow-x-auto rounded-lg border bg-white md:block">
                <table className="w-full text-sm">
                    <thead className="bg-gray-50 text-left text-xs uppercase tracking-wide text-gray-500">
                        <tr>
                            <th className="px-4 py-3">Asset</th>
                            <th className="px-4 py-3">When</th>
                            <th className="px-4 py-3">Who</th>
                            <th className="px-4 py-3">Reason</th>
                            <th className="px-4 py-3">Booked</th>
                            <th className="px-4 py-3">Status</th>
                            <th className="px-4 py-3" />
                        </tr>
                    </thead>
                    <tbody className="divide-y">
                        {filtered.map((b) => (
                            <tr key={b.id} className="hover:bg-gray-50">
                                <td className="px-4 py-3 font-medium">{b.assetName}</td>
                                <td className="px-4 py-3 text-gray-600">{formatRange(b.start, b.end)}</td>
                                <td className="px-4 py-3">
                                    <div>{b.requester?.name}</div>
                                    <div className="text-xs text-gray-400">{b.requester?.email}</div>
                                </td>
                                <td className="max-w-[16rem] truncate px-4 py-3 text-gray-600">{b.reason}</td>
                                <td className="px-4 py-3 text-xs text-gray-400">
                                    {new Date(b.createdAt).toLocaleDateString('en-ZA')}
                                </td>
                                <td className="px-4 py-3"><BookingStatusBadge status={b.status} /></td>
                                <td className="px-4 py-3">
                                    {canModify(b) && (
                                        <div className="flex justify-end gap-1">
                                            <Button variant="ghost" size="icon" onClick={() => openAmend(b)} aria-label="Move booking">
                                                <Pencil className="h-4 w-4" />
                                            </Button>
                                            <Button
                                                variant="ghost"
                                                onClick={() => handleCancel(b)}
                                                disabled={busyId === b.id}
                                                className="text-red-600 hover:bg-red-50"
                                            >
                                                Cancel
                                            </Button>
                                        </div>
                                    )}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {filtered.length === 0 && (
                <div className="rounded-lg border bg-gray-50 p-8 text-center text-gray-500">
                    No bookings match those filters.
                </div>
            )}

            <Dialog open={!!amending} onOpenChange={(open) => !open && setAmending(null)}>
                <DialogContent className="p-6 sm:max-w-[460px]">
                    <DialogHeader className="mb-2">
                        <DialogTitle>Edit booking</DialogTitle>
                        <DialogDescription>
                            {amending?.assetName} for {amending?.requester?.name}
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Starts</label>
                                <Input type="date" value={amendDate} onChange={(e) => setAmendDate(e.target.value)} />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Ends</label>
                                <Input type="date" value={amendEndDate} min={amendDate} onChange={(e) => setAmendEndDate(e.target.value)} />
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-2">
                                <label className="text-sm font-medium">From</label>
                                <Input type="time" step="900" value={amendStart} onChange={(e) => setAmendStart(e.target.value)} />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Until</label>
                                <Input type="time" step="900" value={amendEnd} onChange={(e) => setAmendEnd(e.target.value)} />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Reason for the booking</label>
                            <Textarea
                                rows={2}
                                value={amendReason}
                                onChange={(e) => setAmendReason(e.target.value)}
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Note to the requester</label>
                            <Textarea
                                rows={2}
                                placeholder="e.g. moved to avoid the athletics fixture"
                                value={amendNote}
                                onChange={(e) => setAmendNote(e.target.value)}
                            />
                        </div>

                        {amendError && (
                            <div className="rounded-md bg-red-50 p-3 text-sm text-red-700">{amendError}</div>
                        )}
                    </div>

                    <div className="flex justify-end gap-2 pt-4">
                        <Button variant="outline" onClick={() => setAmending(null)} disabled={amendSaving}>
                            Cancel
                        </Button>
                        <Button onClick={submitAmend} disabled={amendSaving}>
                            {amendSaving && <Loader className="mr-2 h-4 w-4 animate-spin" />}
                            Move booking
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
};

export default BookingsDashboard;
