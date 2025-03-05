// src/components/NotificationBell.jsx
import React, { useState, useEffect } from 'react';
import { ref, onValue, update } from 'firebase/database';
import { database } from '@/config/firebase';
import { useAuth } from '@/components/auth/AuthProvider';
import {
    Bell,
    BellOff,
    AlertCircle,
    CheckCircle,
    Clock,
    X,
    Package
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from '@/components/ui/popover';
import { format, formatDistanceToNow } from 'date-fns';


const NotificationBell = ({ userRole = 'staff' }) => {
    const [notifications, setNotifications] = useState([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [open, setOpen] = useState(false);
    const { user } = useAuth();

    // Filter to only show notifications to supervisors and estate managers
    const isAuthorized = ['supervisor', 'admin', 'estate_manager'].includes(userRole);

    useEffect(() => {
        if (!isAuthorized || !user) return;

        // Listen for notifications in real-time
        const notificationsRef = ref(database, 'notifications');
        const unsubscribe = onValue(notificationsRef, (snapshot) => {
            if (snapshot.exists()) {
                // Get all notifications
                const allNotifications = Object.entries(snapshot.val()).map(([id, data]) => ({
                    id,
                    ...data
                }));

                // Filter notifications for this user's role
                const userNotifications = allNotifications.filter(notification =>
                    notification.userRole === userRole ||
                    notification.userRole === 'all' ||
                    (userRole === 'admin' && ['supervisor', 'estate_manager'].includes(notification.userRole))
                );

                // Sort by date (most recent first)
                userNotifications.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

                setNotifications(userNotifications);
                setUnreadCount(userNotifications.filter(n => !n.read).length);
            } else {
                setNotifications([]);
                setUnreadCount(0);
            }
        });

        return () => unsubscribe();
    }, [user, userRole, isAuthorized]);

    const markAsRead = async (notificationId) => {
        try {
            const notificationRef = ref(database, `notifications/${notificationId}`);
            await update(notificationRef, {
                read: true,
                readAt: new Date().toISOString()
            });
        } catch (error) {
            console.error('Error marking notification as read:', error);
        }
    };

    const markAllAsRead = async () => {
        try {
            // Update each unread notification
            const unreadNotifications = notifications.filter(n => !n.read);
            for (const notification of unreadNotifications) {
                await markAsRead(notification.id);
            }
        } catch (error) {
            console.error('Error marking all notifications as read:', error);
        }
    };

    // Get icon based on notification type
    const getNotificationIcon = (notification) => {
        if (notification.type === 'ticket_paused') {
            if (notification.pauseCategory === 'procurement') {
                return <Package className="h-5 w-5 text-blue-500" />;
            } else {
                return <Clock className="h-5 w-5 text-purple-500" />;
            }
        }

        return <AlertCircle className="h-5 w-5 text-yellow-500" />;
    };

    if (!isAuthorized) return null;

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <Button variant="ghost" size="icon" className="relative">
                    {unreadCount > 0 ? (
                        <>
                            <Bell className="h-5 w-5" />
                            <Badge
                                className="absolute -top-1 -right-1 px-1.5 py-0.5 bg-red-500 text-white text-[10px] min-w-[18px] h-[18px] flex items-center justify-center"
                            >
                                {unreadCount > 9 ? '9+' : unreadCount}
                            </Badge>
                        </>
                    ) : (
                        <Bell className="h-5 w-5" />
                    )}
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80 p-0" align="end">
                <div className="flex items-center justify-between p-4 border-b">
                    <h3 className="font-medium">Notifications</h3>
                    {unreadCount > 0 && (
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={markAllAsRead}
                            className="text-xs h-8"
                        >
                            Mark all as read
                        </Button>
                    )}
                </div>
                <div className="max-h-[400px] overflow-y-auto">
                    {notifications.length === 0 ? (
                        <div className="py-8 px-4 text-center text-gray-500">
                            <BellOff className="h-8 w-8 mx-auto mb-2 text-gray-400" />
                            <p>No notifications</p>
                        </div>
                    ) : (
                        <div className="divide-y">
                            {notifications.map((notification) => (
                                <div
                                    key={notification.id}
                                    className={`p-4 ${notification.read ? 'bg-white' : 'bg-blue-50'}`}
                                >
                                    <div className="flex items-start gap-3">
                                        <div className="flex-shrink-0 mt-1">
                                            {getNotificationIcon(notification)}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex justify-between items-start">
                                                <h4 className="font-medium text-sm">{notification.title}</h4>
                                                <div className="flex gap-1">
                                                    <span className="text-xs text-gray-500">
                                                        {formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true })}
                                                    </span>
                                                    {!notification.read && (
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            className="h-5 w-5 p-0 text-gray-400 hover:text-gray-500"
                                                            onClick={() => markAsRead(notification.id)}
                                                        >
                                                            <X className="h-3 w-3" />
                                                        </Button>
                                                    )}
                                                </div>
                                            </div>
                                            <p className="text-sm mt-1">{notification.message}</p>

                                            {notification.ticketNumber && (
                                                <div className="mt-2 flex flex-wrap gap-2">
                                                    <Badge variant="outline" className="text-xs">
                                                        Ticket #{notification.ticketNumber}
                                                    </Badge>
                                                    {notification.priority && (
                                                        <Badge
                                                            variant="outline"
                                                            className={`text-xs ${notification.priority === 'high' ? 'bg-red-50 text-red-700 border-red-200' :
                                                                    notification.priority === 'medium' ? 'bg-yellow-50 text-yellow-700 border-yellow-200' :
                                                                        'bg-green-50 text-green-700 border-green-200'
                                                                }`}
                                                        >
                                                            {notification.priority} priority
                                                        </Badge>
                                                    )}
                                                    {notification.estimatedDuration && (
                                                        <Badge variant="outline" className="text-xs bg-purple-50 text-purple-700 border-purple-200">
                                                            Est. {notification.estimatedDuration.replace(/_/g, ' ')}
                                                        </Badge>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </PopoverContent>
        </Popover>
    );
};

export default NotificationBell;