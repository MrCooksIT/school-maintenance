// src/components/bookings/BookingWeekView.jsx
//
// A Google-Calendar-style week grid for one asset: seven day columns against an
// hourly time gutter. Rows are hourly here rather than half-hourly as in day
// view, so a long bookable day (05:00-23:59) stays a sensible height. Clicking
// an empty cell still books that hour; the underlying slot locks remain
// 15-minute accurate.

import React, { useMemo } from 'react';
import {
    weekDays,
    daySlots,
    rangesOverlap,
    isBlocking,
    isToday,
    formatTime,
    DEFAULT_HOURS
} from './bookingUtils';

const DAY_NAMES = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

const BookingWeekView = ({ day, asset, bookings, onSelectSlot, onSelectDay }) => {
    const days = useMemo(() => weekDays(day), [day]);

    // The hourly ladder, taken from the first day so every column lines up.
    const rows = useMemo(
        () => daySlots(days[0], asset?.hours || DEFAULT_HOURS, 60),
        [days, asset]
    );

    const blocking = useMemo(() => bookings.filter(isBlocking), [bookings]);

    if (rows.length === 0) {
        return (
            <div className="rounded-lg border bg-amber-50 p-6 text-center text-sm text-amber-800">
                No bookable hours for this asset.
            </div>
        );
    }

    // Offset each row onto a given day, then find what occupies it.
    const cellFor = (columnDay, row) => {
        const start = new Date(columnDay);
        const rowStart = new Date(row.start);
        start.setHours(rowStart.getHours(), rowStart.getMinutes(), 0, 0);

        const end = new Date(start);
        const rowEnd = new Date(row.end);
        // A row ending at midnight belongs to the following day.
        const spansMidnight = rowEnd.getDate() !== rowStart.getDate();
        end.setHours(rowEnd.getHours(), rowEnd.getMinutes(), 0, 0);
        if (spansMidnight) end.setDate(end.getDate() + 1);

        const booking = blocking.find((b) => rangesOverlap(start.getTime(), end.getTime(), b.start, b.end));
        return { start: start.getTime(), end: end.getTime(), booking };
    };

    return (
        <div className="overflow-x-auto rounded-lg border bg-white">
            <div className="min-w-[640px]">
                {/* Day headers */}
                <div className="grid grid-cols-[3.5rem_repeat(7,1fr)] border-b bg-gray-50">
                    <div />
                    {days.map((d, i) => (
                        <button
                            key={d.toISOString()}
                            onClick={() => onSelectDay(d)}
                            className={`px-1 py-2 text-center transition-colors hover:bg-gray-100 ${isToday(d) ? 'bg-marist/5' : ''
                                }`}
                            title="Open this day"
                        >
                            <div className="text-xs text-gray-500">{DAY_NAMES[i]}</div>
                            <div className={`text-sm font-medium ${isToday(d) ? 'text-marist' : 'text-gray-900'}`}>
                                {d.getDate()}
                            </div>
                        </button>
                    ))}
                </div>

                {/* Hour rows */}
                <div className="divide-y">
                    {rows.map((row) => (
                        <div key={row.start} className="grid grid-cols-[3.5rem_repeat(7,1fr)]">
                            <div className="border-r bg-gray-50 px-1 py-2 text-right text-xs tabular-nums text-gray-500">
                                {formatTime(row.start)}
                            </div>

                            {days.map((columnDay) => {
                                const { start, end, booking } = cellFor(columnDay, row);
                                const inPast = end <= Date.now();

                                if (booking) {
                                    const pending = booking.status === 'pending';
                                    const isFirstHour = booking.start >= start || rangesOverlap(start, end, booking.start, booking.start + 1);
                                    return (
                                        <div
                                            key={columnDay.toISOString()}
                                            title={`${booking.reason || 'Booked'} - ${booking.requester?.name || ''} (${booking.status})`}
                                            className={`min-h-[2.5rem] border-r px-1 py-1 last:border-r-0 ${pending ? 'bg-amber-100' : 'bg-slate-200'
                                                }`}
                                            style={pending ? {
                                                backgroundImage:
                                                    'repeating-linear-gradient(45deg, rgba(217,119,6,0.14) 0 6px, transparent 6px 12px)'
                                            } : undefined}
                                        >
                                            {isFirstHour && (
                                                <p className={`truncate text-[11px] font-medium leading-tight ${pending ? 'text-amber-900' : 'text-slate-700'
                                                    }`}>
                                                    {booking.requester?.name?.split(' ')[0] || 'Booked'}
                                                </p>
                                            )}
                                        </div>
                                    );
                                }

                                return (
                                    <button
                                        key={columnDay.toISOString()}
                                        onClick={() => onSelectSlot({ start, end })}
                                        disabled={inPast}
                                        title={inPast ? 'Past' : 'Book this time'}
                                        className={`min-h-[2.5rem] border-r last:border-r-0 ${inPast ? 'cursor-not-allowed bg-gray-50' : 'hover:bg-emerald-50'
                                            }`}
                                    />
                                );
                            })}
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default BookingWeekView;
