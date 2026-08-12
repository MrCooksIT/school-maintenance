// src/components/bookings/BookingStatusBadge.jsx
import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Clock, CheckCircle2, XCircle, Ban } from 'lucide-react';

const STATUS_STYLES = {
    pending: { label: 'Pending', className: 'bg-amber-100 text-amber-900 hover:bg-amber-100', Icon: Clock },
    confirmed: { label: 'Confirmed', className: 'bg-emerald-100 text-emerald-800 hover:bg-emerald-100', Icon: CheckCircle2 },
    declined: { label: 'Declined', className: 'bg-red-100 text-red-800 hover:bg-red-100', Icon: XCircle },
    cancelled: { label: 'Cancelled', className: 'bg-gray-200 text-gray-700 hover:bg-gray-200', Icon: Ban }
};

const BookingStatusBadge = ({ status, className = '' }) => {
    const style = STATUS_STYLES[status] || STATUS_STYLES.pending;
    const { Icon } = style;
    return (
        <Badge className={`${style.className} ${className}`}>
            <Icon className="mr-1 h-3 w-3" />
            {style.label}
        </Badge>
    );
};

export default BookingStatusBadge;
