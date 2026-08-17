// src/components/bookings/BookingCalendar.jsx
//
// The teacher-facing view: pick an asset, pick a day, see what is free, tap a
// free slot to request it. Built for a phone held between classes - the slot
// ladder is a single tappable column, not a scaled-down desktop week grid.

import React, { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
    ChevronLeft,
    ChevronRight,
    Plus,
    Loader,
    CalendarDays,
    DoorOpen,
    Car,
    Package,
    Info
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAssets, useBookingsForAsset } from './useBookingData';
import BookingModal from './BookingModal';
import BookingWeekView from './BookingWeekView';
import BookingMonthView from './BookingMonthView';
import {
    daySlots,
    rangesOverlap,
    isBlocking,
    formatTime,
    toDateInputValue,
    startOfWeek,
    addDays,
    DEFAULT_HOURS
} from './bookingUtils';

const TYPE_META = {
    room: { label: 'Rooms', icon: DoorOpen },
    vehicle: { label: 'Vehicles', icon: Car },
    equipment: { label: 'Equipment', icon: Package }
};

const startOfDay = (d) => {
    const x = new Date(d);
    x.setHours(0, 0, 0, 0);
    return x;
};

const BookingCalendar = () => {
    const { assets, loading: assetsLoading, error } = useAssets();

    const [typeFilter, setTypeFilter] = useState('all');
    const [selectedAssetId, setSelectedAssetId] = useState(null);
    const [day, setDay] = useState(() => startOfDay(new Date()));
    const [modalOpen, setModalOpen] = useState(false);
    const [pendingSlot, setPendingSlot] = useState(null);

    // Week on a desktop, day on a phone - the tappable ladder is the better
    // between-classes experience, and a 7-column grid is cramped below 768px.
    const [view, setView] = useState(() =>
        typeof window !== 'undefined' && window.innerWidth >= 768 ? 'week' : 'day'
    );

    const activeAssets = useMemo(
        () => assets.filter((a) => a.status !== 'retired'),
        [assets]
    );

    const visibleAssets = useMemo(
        () => (typeFilter === 'all' ? activeAssets : activeAssets.filter((a) => a.type === typeFilter)),
        [activeAssets, typeFilter]
    );

    // Keep a valid selection as filters change.
    const selectedAsset =
        visibleAssets.find((a) => a.id === selectedAssetId) || visibleAssets[0] || null;

    const { bookings, loading: bookingsLoading } = useBookingsForAsset(selectedAsset?.id);

    const slots = useMemo(
        () => daySlots(day, selectedAsset?.hours || DEFAULT_HOURS, 30),
        [day, selectedAsset]
    );

    // Which booking, if any, occupies each display slot.
    const slotState = useMemo(() => {
        const blocking = bookings.filter(isBlocking);
        let previousBookingId = null;

        return slots.map((slot) => {
            const booking = blocking.find((b) => rangesOverlap(slot.start, slot.end, b.start, b.end));
            const isFirst = booking ? booking.id !== previousBookingId : false;
            previousBookingId = booking ? booking.id : null;
            return { ...slot, booking, isFirst };
        });
    }, [slots, bookings]);

    // Paging steps by whatever unit is on screen.
    const shift = (direction) => {
        if (view === 'week') {
            setDay(addDays(day, direction * 7));
        } else if (view === 'month') {
            setDay(startOfDay(new Date(day.getFullYear(), day.getMonth() + direction, 1)));
        } else {
            setDay(addDays(day, direction));
        }
    };

    const periodLabel = () => {
        if (view === 'month') {
            return day.toLocaleDateString('en-ZA', { month: 'long', year: 'numeric' });
        }
        if (view === 'week') {
            const start = startOfWeek(day);
            const end = addDays(start, 6);
            const sameMonth = start.getMonth() === end.getMonth();
            return sameMonth
                ? `${start.getDate()}-${end.getDate()} ${start.toLocaleDateString('en-ZA', { month: 'short', year: 'numeric' })}`
                : `${start.getDate()} ${start.toLocaleDateString('en-ZA', { month: 'short' })} - ${end.getDate()} ${end.toLocaleDateString('en-ZA', { month: 'short', year: 'numeric' })}`;
        }
        return day.toLocaleDateString('en-ZA', { weekday: 'long', day: 'numeric', month: 'long' });
    };

    const openBookingFor = (slot) => {
        setPendingSlot(slot);
        setModalOpen(true);
    };

    if (assetsLoading) {
        return (
            <div className="flex items-center justify-center h-64">
                <Loader className="h-8 w-8 animate-spin text-blue-500" />
                <span className="ml-2">Loading assets...</span>
            </div>
        );
    }

    if (error) {
        return <div className="rounded-lg bg-red-50 p-4 text-red-700">{error}</div>;
    }

    if (activeAssets.length === 0) {
        return (
            <div className="p-6 text-center">
                <CalendarDays className="h-12 w-12 mx-auto text-gray-400 mb-3" />
                <h2 className="text-lg font-semibold mb-1">Nothing to book yet</h2>
                <p className="text-gray-500 mb-4">
                    No rooms, vehicles or equipment have been set up.
                </p>
                <Link to="/bookings/assets">
                    <Button>Manage assets</Button>
                </Link>
            </div>
        );
    }

    const isToday = startOfDay(new Date()).getTime() === day.getTime();

    return (
        <div className="space-y-4 max-w-3xl mx-auto">
            <div className="flex items-center justify-between gap-2">
                <h1 className="text-xl sm:text-2xl font-bold">Book an asset</h1>
                <Link to="/bookings/mine" className="text-sm text-blue-600 hover:underline whitespace-nowrap">
                    My requests
                </Link>
            </div>

            {/* Asset type filter */}
            <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
                {['all', 'room', 'vehicle', 'equipment'].map((type) => {
                    const Icon = TYPE_META[type]?.icon;
                    const active = typeFilter === type;
                    return (
                        <button
                            key={type}
                            onClick={() => setTypeFilter(type)}
                            className={`flex items-center gap-1.5 whitespace-nowrap rounded-full px-3 py-1.5 text-sm transition-colors ${active
                                ? 'bg-marist text-white'
                                : 'bg-white border text-gray-600 hover:bg-gray-50'
                                }`}
                        >
                            {Icon && <Icon className="h-4 w-4" />}
                            {type === 'all' ? 'All' : TYPE_META[type].label}
                        </button>
                    );
                })}
            </div>

            {/* Asset picker */}
            {visibleAssets.length === 0 ? (
                <p className="text-sm text-gray-500">No assets of this type.</p>
            ) : (
                <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
                    {visibleAssets.map((asset) => {
                        const active = selectedAsset?.id === asset.id;
                        return (
                            <button
                                key={asset.id}
                                onClick={() => setSelectedAssetId(asset.id)}
                                className={`whitespace-nowrap rounded-lg border px-3 py-2 text-sm transition-colors ${active
                                    ? 'border-marist bg-marist/5 font-medium text-marist'
                                    : 'bg-white text-gray-700 hover:bg-gray-50'
                                    }`}
                            >
                                {asset.name}
                                {asset.approvalMode === 'signoff' && (
                                    <span className="ml-1.5 text-xs text-amber-600">sign-off</span>
                                )}
                            </button>
                        );
                    })}
                </div>
            )}

            {/* View switcher */}
            <div className="flex items-center justify-between gap-2">
                <div className="inline-flex rounded-lg border bg-white p-0.5">
                    {['day', 'week', 'month'].map((v) => (
                        <button
                            key={v}
                            onClick={() => setView(v)}
                            className={`rounded-md px-3 py-1.5 text-sm capitalize transition-colors ${view === v ? 'bg-marist text-white' : 'text-gray-600 hover:bg-gray-50'
                                }`}
                        >
                            {v}
                        </button>
                    ))}
                </div>
                {!isToday && (
                    <Button variant="outline" onClick={() => setDay(startOfDay(new Date()))}>
                        Today
                    </Button>
                )}
            </div>

            {/* Period navigation */}
            <div className="flex items-center gap-2">
                <Button variant="outline" size="icon" onClick={() => shift(-1)} aria-label={`Previous ${view}`}>
                    <ChevronLeft className="h-4 w-4" />
                </Button>

                <div className="flex-1 text-center text-sm font-medium">{periodLabel()}</div>

                <Button variant="outline" size="icon" onClick={() => shift(1)} aria-label={`Next ${view}`}>
                    <ChevronRight className="h-4 w-4" />
                </Button>

                {view === 'day' && (
                    <Input
                        type="date"
                        value={toDateInputValue(day)}
                        onChange={(e) => {
                            if (!e.target.value) return;
                            const [y, m, d] = e.target.value.split('-').map(Number);
                            setDay(startOfDay(new Date(y, m - 1, d)));
                        }}
                        className="w-40 shrink-0"
                    />
                )}
            </div>

            {/* Slot ladder */}
            {bookingsLoading ? (
                <div className="flex items-center justify-center h-40">
                    <Loader className="h-6 w-6 animate-spin text-blue-500" />
                </div>
            ) : view === 'week' ? (
                <BookingWeekView
                    day={day}
                    asset={selectedAsset}
                    bookings={bookings}
                    onSelectSlot={openBookingFor}
                    onSelectDay={(d) => { setDay(startOfDay(d)); setView('day'); }}
                />
            ) : view === 'month' ? (
                <BookingMonthView
                    day={day}
                    bookings={bookings}
                    onSelectDay={(d) => { setDay(startOfDay(d)); setView('day'); }}
                />
            ) : slotState.length === 0 ? (
                <div className="rounded-lg border bg-amber-50 p-6 text-center text-sm text-amber-800">
                    <p className="font-medium">No bookable hours for this asset.</p>
                    <p className="mt-1">
                        Check its bookable hours under Bookable assets - they currently read{' '}
                        {selectedAsset?.hours?.dayStart || DEFAULT_HOURS.dayStart}
                        {' to '}
                        {selectedAsset?.hours?.dayEnd || DEFAULT_HOURS.dayEnd}.
                    </p>
                </div>
            ) : (
                <div className="rounded-lg border overflow-hidden bg-white divide-y">
                    {slotState.map(({ start, end, booking, isFirst }) => {
                        const inPast = end <= Date.now();

                        if (booking) {
                            const pending = booking.status === 'pending';
                            return (
                                <div
                                    key={start}
                                    className={`flex items-stretch gap-3 px-3 py-2 ${pending ? 'bg-amber-50' : 'bg-slate-100'}`}
                                    style={pending ? {
                                        backgroundImage:
                                            'repeating-linear-gradient(45deg, rgba(217,119,6,0.10) 0 8px, transparent 8px 16px)'
                                    } : undefined}
                                >
                                    <span className="w-14 shrink-0 pt-0.5 text-sm tabular-nums text-gray-500">
                                        {formatTime(start)}
                                    </span>
                                    <div className={`w-1 rounded-full ${pending ? 'bg-amber-500' : 'bg-slate-500'}`} />
                                    <div className="min-w-0 flex-1">
                                        {isFirst ? (
                                            <>
                                                <p className="truncate text-sm font-medium text-gray-900">
                                                    {booking.reason || 'Booked'}
                                                </p>
                                                <p className="truncate text-xs text-gray-600">
                                                    {booking.requester?.name || 'Unknown'}
                                                    {' · '}
                                                    {formatTime(booking.start)}-{formatTime(booking.end)}
                                                </p>
                                                <span className={`mt-1 inline-block rounded-full px-2 py-0.5 text-xs font-medium ${pending
                                                    ? 'bg-amber-200 text-amber-900'
                                                    : 'bg-slate-300 text-slate-800'
                                                    }`}>
                                                    {pending ? 'Pending approval' : 'Confirmed'}
                                                </span>
                                            </>
                                        ) : (
                                            <span className="text-xs text-gray-400">continues</span>
                                        )}
                                    </div>
                                </div>
                            );
                        }

                        return (
                            <button
                                key={start}
                                onClick={() => openBookingFor({ start, end })}
                                disabled={inPast}
                                className={`flex w-full items-center gap-3 px-3 py-3 text-left transition-colors ${inPast
                                    ? 'cursor-not-allowed bg-gray-50 text-gray-300'
                                    : 'hover:bg-emerald-50'
                                    }`}
                            >
                                <span className="w-14 shrink-0 text-sm tabular-nums text-gray-500">
                                    {formatTime(start)}
                                </span>
                                <span className={`flex-1 text-sm ${inPast ? '' : 'text-emerald-700'}`}>
                                    {inPast ? 'Past' : 'Free'}
                                </span>
                                {!inPast && <Plus className="h-4 w-4 text-emerald-600" />}
                            </button>
                        );
                    })}
                </div>
            )}

            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-gray-500">
                <span className="flex items-center gap-1.5">
                    <span className="h-3 w-3 rounded-sm bg-slate-400" /> Confirmed
                </span>
                <span className="flex items-center gap-1.5">
                    <span className="h-3 w-3 rounded-sm bg-amber-400" /> Pending approval (slot is held)
                </span>
                <span className="flex items-center gap-1.5">
                    <span className="h-3 w-3 rounded-sm border bg-white" /> Free - tap to book
                </span>
            </div>

            {selectedAsset?.approvalMode === 'signoff' && (
                <p className="flex items-start gap-2 text-xs text-gray-500">
                    <Info className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                    {selectedAsset.name} needs sign-off. Your slot is held from the moment you request it,
                    and shows to everyone as pending until it is approved.
                </p>
            )}

            <BookingModal
                open={modalOpen}
                onOpenChange={setModalOpen}
                asset={selectedAsset}
                initialStart={pendingSlot?.start}
                initialEnd={pendingSlot?.end}
            />
        </div>
    );
};

export default BookingCalendar;
