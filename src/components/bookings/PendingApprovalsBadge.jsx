// src/components/bookings/PendingApprovalsBadge.jsx
//
// The in-app signal that something is waiting for you. Sits on the sidebar's
// Approvals link, in the same style as ReopenRequestsBadge.

import React, { useMemo } from 'react';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '../auth/AuthProvider';
import { useAllBookings, useAssets, useGlobalApprovers } from './useBookingData';
import { canApprove } from './bookingService';

const PendingApprovalsBadge = ({ className = '' }) => {
    const { user, isDatabaseAdmin } = useAuth();
    const { bookings } = useAllBookings();
    const { assets } = useAssets();
    const { approvers: globalApprovers } = useGlobalApprovers();

    const assetById = useMemo(
        () => Object.fromEntries(assets.map((a) => [a.id, a])),
        [assets]
    );

    const count = useMemo(
        () => bookings.filter((b) =>
            b.status === 'pending' &&
            canApprove({ uid: user?.uid, isDatabaseAdmin, asset: assetById[b.assetId], globalApprovers })
        ).length,
        [bookings, assetById, globalApprovers, user, isDatabaseAdmin]
    );

    if (count === 0) return null;

    return (
        <Badge className={`bg-amber-500 text-white hover:bg-amber-500 ${className}`}>
            {count}
        </Badge>
    );
};

export default PendingApprovalsBadge;
