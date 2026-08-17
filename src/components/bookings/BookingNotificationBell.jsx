// src/components/bookings/BookingNotificationBell.jsx
//
// The bell in the header. Reads bookingNotifications/{uid}, so it only ever
// shows the signed-in person their own notifications - the rules enforce that
// too. Replaces the old NotificationBell, which was never mounted and filtered
// by role rather than by user.

import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ref, onValue, update, query, orderByChild, limitToLast } from 'firebase/database';
import { database } from '@/config/firebase';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
    Bell,
    CheckCircle2,
    XCircle,
    Clock,
    Ban,
    CalendarClock,
    FileText
} from 'lucide-react';
import { useAuth } from '../auth/AuthProvider';

const TYPE_META = {
    booking_pending: { Icon: Clock, className: 'text-amber-500' },
    booking_approved: { Icon: CheckCircle2, className: 'text-emerald-600' },
    booking_declined: { Icon: XCircle, className: 'text-red-500' },
    booking_cancelled: { Icon: Ban, className: 'text-gray-500' },
    booking_amended: { Icon: CalendarClock, className: 'text-blue-500' },
    booking_updated: { Icon: FileText, className: 'text-blue-500' }
};

// Where clicking a notification should take you.
const destinationFor = (notification) =>
    notification.type === 'booking_pending' || notification.type === 'booking_updated'
        ? '/bookings/approvals'
        : '/bookings/mine';

function relativeTime(iso) {
    const then = new Date(iso).getTime();
    if (!Number.isFinite(then)) return '';
    const mins = Math.round((Date.now() - then) / 60000);
    if (mins < 1) return 'just now';
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.round(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.round(hours / 24);
    return days === 1 ? 'yesterday' : `${days}d ago`;
}

const BookingNotificationBell = () => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [notifications, setNotifications] = useState([]);
    const [open, setOpen] = useState(false);

    useEffect(() => {
        if (!user?.uid) {
            setNotifications([]);
            return;
        }

        // Only the recent tail matters for a bell.
        const inbox = query(
            ref(database, `bookingNotifications/${user.uid}`),
            orderByChild('createdAt'),
            limitToLast(30)
        );

        const unsubscribe = onValue(
            inbox,
            (snapshot) => {
                if (!snapshot.exists()) {
                    setNotifications([]);
                    return;
                }
                const list = Object.entries(snapshot.val())
                    .map(([id, data]) => ({ id, ...data }))
                    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
                setNotifications(list);
            },
            (error) => {
                console.error('Could not load notifications:', error);
                setNotifications([]);
            }
        );

        return () => unsubscribe();
    }, [user?.uid]);

    const unreadCount = useMemo(
        () => notifications.filter((n) => !n.read).length,
        [notifications]
    );

    const markRead = async (notification) => {
        if (notification.read) return;
        try {
            await update(ref(database, `bookingNotifications/${user.uid}/${notification.id}`), {
                read: true,
                readAt: new Date().toISOString()
            });
        } catch (error) {
            console.error('Could not mark notification read:', error);
        }
    };

    const markAllRead = async () => {
        const unread = notifications.filter((n) => !n.read);
        if (unread.length === 0) return;
        const updates = {};
        const now = new Date().toISOString();
        unread.forEach((n) => {
            updates[`bookingNotifications/${user.uid}/${n.id}/read`] = true;
            updates[`bookingNotifications/${user.uid}/${n.id}/readAt`] = now;
        });
        try {
            await update(ref(database), updates);
        } catch (error) {
            console.error('Could not mark all read:', error);
        }
    };

    const openNotification = (notification) => {
        markRead(notification);
        setOpen(false);
        navigate(destinationFor(notification));
    };

    if (!user) return null;

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <button
                    className="relative rounded-full p-2 text-white hover:bg-blue-900/50"
                    aria-label={unreadCount > 0 ? `${unreadCount} unread notifications` : 'Notifications'}
                >
                    <Bell className="h-6 w-6" />
                    {unreadCount > 0 && (
                        <span className="absolute -right-0.5 -top-0.5 flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-amber-500 px-1 text-xs font-semibold text-white">
                            {unreadCount > 9 ? '9+' : unreadCount}
                        </span>
                    )}
                </button>
            </PopoverTrigger>

            <PopoverContent align="end" className="w-80 p-0">
                <div className="flex items-center justify-between border-b px-4 py-2.5">
                    <span className="text-sm font-semibold">Notifications</span>
                    {unreadCount > 0 && (
                        <button onClick={markAllRead} className="text-xs text-blue-600 hover:underline">
                            Mark all read
                        </button>
                    )}
                </div>

                <div className="max-h-80 overflow-y-auto">
                    {notifications.length === 0 ? (
                        <p className="px-4 py-8 text-center text-sm text-gray-500">
                            Nothing yet.
                        </p>
                    ) : (
                        <div className="divide-y">
                            {notifications.map((notification) => {
                                const meta = TYPE_META[notification.type] || { Icon: Bell, className: 'text-gray-400' };
                                const { Icon } = meta;
                                return (
                                    <button
                                        key={notification.id}
                                        onClick={() => openNotification(notification)}
                                        className={`flex w-full items-start gap-2.5 px-4 py-3 text-left hover:bg-gray-50 ${notification.read ? '' : 'bg-blue-50/50'
                                            }`}
                                    >
                                        <Icon className={`mt-0.5 h-4 w-4 shrink-0 ${meta.className}`} />
                                        <span className="min-w-0 flex-1">
                                            <span className={`block truncate text-sm ${notification.read ? 'text-gray-700' : 'font-medium text-gray-900'
                                                }`}>
                                                {notification.title}
                                            </span>
                                            {notification.message && (
                                                <span className="block truncate text-xs text-gray-500">
                                                    {notification.message}
                                                </span>
                                            )}
                                            <span className="block text-xs text-gray-400">
                                                {relativeTime(notification.createdAt)}
                                            </span>
                                        </span>
                                        {!notification.read && (
                                            <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-blue-500" />
                                        )}
                                    </button>
                                );
                            })}
                        </div>
                    )}
                </div>
            </PopoverContent>
        </Popover>
    );
};

export default BookingNotificationBell;
