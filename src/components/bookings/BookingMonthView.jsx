// src/components/bookings/BookingMonthView.jsx
//
// A month overview for one asset. A month cell is not a time, so tapping a day
// opens that day rather than booking directly - the booking form always gets a
// real start and end.

import React, { useMemo } from 'react';
import { monthGrid, bookingsOnDay, isToday, formatTime } from './bookingUtils';

const DAY_NAMES = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

const BookingMonthView = ({ day, bookings, onSelectDay }) => {
    const cells = useMemo(() => monthGrid(day), [day]);
    const currentMonth = day.getMonth();

    const byDay = useMemo(
        () => cells.map((d) => ({ date: d, items: bookingsOnDay(bookings, d) })),
        [cells, bookings]
    );

    return (
        <div className="overflow-hidden rounded-lg border bg-white">
            <div className="grid grid-cols-7 border-b bg-gray-50">
                {DAY_NAMES.map((name) => (
                    <div key={name} className="px-1 py-2 text-center text-xs font-medium text-gray-500">
                        {name}
                    </div>
                ))}
            </div>

            <div className="grid grid-cols-7">
                {byDay.map(({ date, items }) => {
                    const outside = date.getMonth() !== currentMonth;
                    const today = isToday(date);
                    const pendingCount = items.filter((b) => b.status === 'pending').length;

                    return (
                        <button
                            key={date.toISOString()}
                            onClick={() => onSelectDay(date)}
                            className={`min-h-[4.5rem] border-b border-r p-1 text-left align-top transition-colors hover:bg-emerald-50 ${outside ? 'bg-gray-50/60' : ''
                                }`}
                        >
                            <span className={`inline-flex h-6 w-6 items-center justify-center rounded-full text-xs ${today ? 'bg-marist font-semibold text-white' : outside ? 'text-gray-400' : 'text-gray-700'
                                }`}>
                                {date.getDate()}
                            </span>

                            <div className="mt-1 space-y-0.5">
                                {items.slice(0, 2).map((b) => (
                                    <div
                                        key={b.id}
                                        className={`truncate rounded px-1 text-[10px] leading-tight ${b.status === 'pending'
                                            ? 'bg-amber-100 text-amber-900'
                                            : 'bg-slate-200 text-slate-700'
                                            }`}
                                    >
                                        {formatTime(b.start)} {b.requester?.name?.split(' ')[0] || ''}
                                    </div>
                                ))}
                                {items.length > 2 && (
                                    <div className="px-1 text-[10px] text-gray-500">
                                        +{items.length - 2} more
                                    </div>
                                )}
                            </div>

                            {pendingCount > 0 && (
                                <span className="sr-only">{pendingCount} pending approval</span>
                            )}
                        </button>
                    );
                })}
            </div>
        </div>
    );
};

export default BookingMonthView;
