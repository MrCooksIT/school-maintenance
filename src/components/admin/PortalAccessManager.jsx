// src/components/admin/PortalAccessManager.jsx
//
// Who may see the maintenance portal. Everyone else who signs in gets the
// booking side of the app only - no tickets, no jobs, no dashboard.
//
// Backed by maintenanceStaff/{uid}. It is uid-keyed on purpose: the security
// rules can only match on auth.uid, and the staff/ node is keyed by push id, so
// staff records cannot be used for this.

import React, { useMemo, useState } from 'react';
import { ref, update } from 'firebase/database';
import { database } from '@/config/firebase';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Loader, Wrench, Search, ShieldAlert } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { useUsers } from '../bookings/useBookingData';
import { useMaintenanceStaff, useObservers } from './useMaintenanceStaff';
import { useAuth } from '../auth/AuthProvider';

const PortalAccessManager = () => {
    const { user } = useAuth();
    const { users, loading: usersLoading } = useUsers();
    const { maintenanceStaff, loading: accessLoading } = useMaintenanceStaff();
    const { observers, loading: observersLoading } = useObservers();
    const { toast } = useToast();
    const [search, setSearch] = useState('');

    const filtered = useMemo(() => {
        const term = search.trim().toLowerCase();
        if (!term) return users;
        return users.filter((u) =>
            [u.name, u.email].filter(Boolean).some((v) => v.toLowerCase().includes(term))
        );
    }, [users, search]);

    const grantedCount = Object.values(maintenanceStaff || {}).filter(Boolean).length;

    const toggleObserver = async (target) => {
        const isObserver = !!observers[target.id];
        try {
            await update(ref(database, 'observers'), { [target.id]: isObserver ? null : true });
            toast({
                title: isObserver ? 'Oversight removed' : 'Oversight granted',
                description: `${target.name || target.email} ${isObserver ? 'can no longer' : 'can now'} view the maintenance portal read-only.`,
                variant: 'success'
            });
        } catch (error) {
            console.error('Could not update observers:', error);
            toast({ title: 'Error', description: error.message, variant: 'destructive' });
        }
    };

    const toggle = async (target) => {
        const hasAccess = !!maintenanceStaff[target.id];

        if (hasAccess && target.id === user?.uid) {
            const confirmed = window.confirm(
                'This removes your own access to the maintenance portal. Continue?'
            );
            if (!confirmed) return;
        }

        try {
            await update(ref(database, 'maintenanceStaff'), {
                [target.id]: hasAccess ? null : true
            });
            toast({
                title: hasAccess ? 'Access removed' : 'Access granted',
                description: `${target.name || target.email} ${hasAccess ? 'can no longer' : 'can now'} see the maintenance portal.`,
                variant: 'success'
            });
        } catch (error) {
            console.error('Could not update maintenance access:', error);
            toast({ title: 'Error', description: error.message, variant: 'destructive' });
        }
    };

    if (usersLoading || accessLoading || observersLoading) {
        return (
            <div className="flex h-64 items-center justify-center">
                <Loader className="h-8 w-8 animate-spin text-blue-500" />
                <span className="ml-2">Loading...</span>
            </div>
        );
    }

    return (
        <div className="mx-auto max-w-2xl space-y-5">
            <div className="flex items-center gap-2">
                <Wrench className="h-6 w-6 text-marist" />
                <h1 className="text-2xl font-bold">Maintenance portal access</h1>
            </div>

            {grantedCount === 0 && (
                <div className="flex items-start gap-2 rounded-lg bg-amber-50 p-4 text-sm text-amber-800">
                    <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" />
                    <span>
                        Nobody has been granted access yet. Admins can always see the portal,
                        but any maintenance staff who are not admins currently cannot.
                        Tick them below <strong>before</strong> deploying the tightened rules.
                    </span>
                </div>
            )}

            <Card>
                <CardHeader>
                    <CardTitle>Who sees tickets and jobs</CardTitle>
                    <CardDescription>
                        Everyone signs in to the same app. <strong>Full</strong> means they
                        can work the ticket queue - view, assign and edit.
                        <strong> Oversight</strong> means they can see everything but change
                        nothing, for people who need to follow up rather than do the work.
                        Everyone unticked only ever sees Bookings. Admins always have full
                        access and do not need ticking.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                        <Input
                            placeholder="Search by name or email"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="pl-9"
                        />
                    </div>

                    {filtered.length === 0 ? (
                        <p className="py-4 text-sm text-gray-500">
                            {users.length === 0
                                ? 'Nobody has signed in yet. People appear here once they have logged in at least once.'
                                : 'Nobody matches that search.'}
                        </p>
                    ) : (
                        <div className="divide-y">
                            {filtered.map((target) => (
                                <div
                                    key={target.id}
                                    className="flex items-center justify-between gap-3 py-3"
                                >
                                    <div className="min-w-0">
                                        <p className="truncate text-sm font-medium">
                                            {target.name || target.email}
                                            {target.id === user?.uid && (
                                                <span className="ml-1 text-xs text-gray-400">(you)</span>
                                            )}
                                        </p>
                                        <p className="truncate text-xs text-gray-500">{target.email}</p>
                                    </div>
                                    <div className="flex shrink-0 items-center gap-4">
                                        <label className="flex cursor-pointer items-center gap-1.5 text-xs text-gray-600">
                                            <input
                                                type="checkbox"
                                                checked={!!maintenanceStaff[target.id]}
                                                onChange={() => toggle(target)}
                                                className="h-5 w-5"
                                            />
                                            Full
                                        </label>
                                        <label className="flex cursor-pointer items-center gap-1.5 text-xs text-gray-600">
                                            <input
                                                type="checkbox"
                                                checked={!!observers[target.id]}
                                                onChange={() => toggleObserver(target)}
                                                className="h-5 w-5"
                                            />
                                            Oversight
                                        </label>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
};

export default PortalAccessManager;
