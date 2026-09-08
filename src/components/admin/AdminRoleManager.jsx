// src/components/admin/AdminRoleManager.jsx
//
// Who is a full administrator.
//
// This screen used to write admins/{staffPushKey}, taking the key from a staff
// record. The security rules match on auth.uid, so those records granted
// nothing at all - three people were shown as supervisors while one of them
// had no access whatsoever. It now writes admins/{uid}, taken from users/,
// which is written by each person when they sign in.
//
// The consequence is that somebody must sign in once before they can be given a
// role. There is nothing else for the rules to match on.
//
// Ticket-level access (full or oversight) lives in Portal access, not here.

import React, { useMemo, useState } from 'react';
import { ref, set, remove, onValue } from 'firebase/database';
import { database } from '@/config/firebase';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Loader, UserCog, Search, ShieldAlert, Trash2 } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { useUsers } from '../bookings/useBookingData';
import { useAuth } from '../auth/AuthProvider';

/** A Firebase uid is 28 url-safe characters. Anything else cannot match auth.uid. */
const isFirebaseUid = (key) => /^[A-Za-z0-9]{28}$/.test(key);

function useAdmins() {
    const [admins, setAdmins] = useState({});
    const [loading, setLoading] = useState(true);

    React.useEffect(() => {
        const unsubscribe = onValue(
            ref(database, 'admins'),
            (snapshot) => {
                setAdmins(snapshot.exists() ? snapshot.val() : {});
                setLoading(false);
            },
            (error) => {
                console.error('Error loading admins:', error);
                setAdmins({});
                setLoading(false);
            }
        );
        return () => unsubscribe();
    }, []);

    return { admins, loading };
}

const AdminRoleManager = () => {
    const { user } = useAuth();
    const { users, loading: usersLoading } = useUsers();
    const { admins, loading: adminsLoading } = useAdmins();
    const { toast } = useToast();
    const [search, setSearch] = useState('');
    const [busy, setBusy] = useState(null);

    const adminEntries = useMemo(
        () => Object.entries(admins).map(([id, data]) => ({ id, ...data, working: isFirebaseUid(id) })),
        [admins]
    );

    const workingAdmins = adminEntries.filter((a) => a.working);
    const brokenAdmins = adminEntries.filter((a) => !a.working);

    const filteredUsers = useMemo(() => {
        const term = search.trim().toLowerCase();
        if (!term) return users;
        return users.filter((u) =>
            [u.name, u.email].filter(Boolean).some((v) => v.toLowerCase().includes(term))
        );
    }, [users, search]);

    const grant = async (target) => {
        setBusy(target.id);
        try {
            await set(ref(database, `admins/${target.id}`), {
                role: 'admin',
                email: target.email,
                name: target.name || target.email,
                createdAt: new Date().toISOString()
            });
            toast({
                title: 'Admin added',
                description: `${target.name || target.email} can now administer the system.`,
                variant: 'success'
            });
        } catch (error) {
            console.error('Could not grant admin:', error);
            toast({ title: 'Error', description: error.message, variant: 'destructive' });
        } finally {
            setBusy(null);
        }
    };

    const revoke = async (entry) => {
        // Losing the last working admin means nobody can manage roles, assets or
        // access without editing the database by hand.
        if (entry.working && workingAdmins.length <= 1) {
            toast({
                title: 'Cannot remove the last admin',
                description: 'Give someone else the admin role first.',
                variant: 'destructive'
            });
            return;
        }

        if (entry.id === user?.uid) {
            const confirmed = window.confirm(
                'This removes your own admin rights. You will lose access to this screen. Continue?'
            );
            if (!confirmed) return;
        }

        setBusy(entry.id);
        try {
            await remove(ref(database, `admins/${entry.id}`));
            toast({
                title: entry.working ? 'Admin removed' : 'Stale record removed',
                description: `${entry.name || entry.email || entry.id} removed.`,
                variant: 'success'
            });
        } catch (error) {
            console.error('Could not remove admin:', error);
            toast({ title: 'Error', description: error.message, variant: 'destructive' });
        } finally {
            setBusy(null);
        }
    };

    if (usersLoading || adminsLoading) {
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
                <UserCog className="h-6 w-6 text-marist" />
                <h1 className="text-2xl font-bold">Administrators</h1>
            </div>

            {brokenAdmins.length > 0 && (
                <Card className="border-amber-300">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-amber-900">
                            <ShieldAlert className="h-5 w-5" />
                            {brokenAdmins.length} record{brokenAdmins.length === 1 ? '' : 's'} granting nothing
                        </CardTitle>
                        <CardDescription>
                            These were saved against a staff record id rather than a Firebase
                            sign-in id, so they look like roles but grant no access at all.
                            Remove them, then grant the person the role again below.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="divide-y">
                            {brokenAdmins.map((entry) => (
                                <div key={entry.id} className="flex items-center justify-between gap-3 py-3">
                                    <div className="min-w-0">
                                        <p className="truncate text-sm font-medium">
                                            {entry.name || entry.email || entry.id}
                                        </p>
                                        <p className="truncate text-xs text-gray-500">
                                            {entry.email} &middot; shown as {entry.role || 'admin'}
                                        </p>
                                    </div>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => revoke(entry)}
                                        disabled={busy === entry.id}
                                        className="shrink-0 border-red-200 text-red-700 hover:bg-red-50"
                                    >
                                        <Trash2 className="mr-1 h-3.5 w-3.5" />
                                        Remove
                                    </Button>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            )}

            <Card>
                <CardHeader>
                    <CardTitle>Current administrators</CardTitle>
                    <CardDescription>
                        Admins can manage assets, approvers, portal access and roles, and can
                        always see the maintenance portal. For staff who should only work the
                        ticket queue, use Portal access instead.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {workingAdmins.length === 0 ? (
                        <p className="py-4 text-sm text-gray-500">No administrators.</p>
                    ) : (
                        <div className="divide-y">
                            {workingAdmins.map((entry) => (
                                <div key={entry.id} className="flex items-center justify-between gap-3 py-3">
                                    <div className="min-w-0">
                                        <p className="truncate text-sm font-medium">
                                            {entry.name || entry.email}
                                            {entry.id === user?.uid && (
                                                <span className="ml-1 text-xs text-gray-400">(you)</span>
                                            )}
                                        </p>
                                        <p className="truncate text-xs text-gray-500">{entry.email}</p>
                                    </div>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => revoke(entry)}
                                        disabled={busy === entry.id}
                                        className="shrink-0 border-red-200 text-red-700 hover:bg-red-50"
                                    >
                                        Remove
                                    </Button>
                                </div>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>Grant admin</CardTitle>
                    <CardDescription>
                        Only people who have signed in at least once appear here - the security
                        rules match on the sign-in id, so there is nothing to grant until then.
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

                    {filteredUsers.length === 0 ? (
                        <p className="py-4 text-sm text-gray-500">
                            {users.length === 0
                                ? 'Nobody has signed in yet.'
                                : 'Nobody matches that search.'}
                        </p>
                    ) : (
                        <div className="divide-y">
                            {filteredUsers.map((target) => {
                                const already = !!admins[target.id];
                                return (
                                    <div key={target.id} className="flex items-center justify-between gap-3 py-3">
                                        <div className="min-w-0">
                                            <p className="truncate text-sm font-medium">
                                                {target.name || target.email}
                                            </p>
                                            <p className="truncate text-xs text-gray-500">{target.email}</p>
                                        </div>
                                        <Button
                                            size="sm"
                                            variant={already ? 'outline' : 'default'}
                                            onClick={() => grant(target)}
                                            disabled={already || busy === target.id}
                                            className="shrink-0"
                                        >
                                            {busy === target.id && <Loader className="mr-2 h-3.5 w-3.5 animate-spin" />}
                                            {already ? 'Already admin' : 'Make admin'}
                                        </Button>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
};

export default AdminRoleManager;
