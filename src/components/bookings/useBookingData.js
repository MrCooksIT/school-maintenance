// src/components/bookings/useBookingData.js
//
// Real-time subscriptions for the booking system. Follows the same onValue
// pattern the rest of the app uses, so data stays live without any refresh.

import { useState, useEffect } from 'react';
import { ref, onValue, query, orderByChild, equalTo } from 'firebase/database';
import { database } from '@/config/firebase';

function toList(snapshot) {
    if (!snapshot.exists()) return [];
    return Object.entries(snapshot.val()).map(([id, data]) => ({ id, ...data }));
}

/** All assets. Retired ones are included - filter at the call site. */
export function useAssets() {
    const [assets, setAssets] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const unsubscribe = onValue(
            ref(database, 'assets'),
            (snapshot) => {
                setAssets(toList(snapshot).sort((a, b) => (a.name || '').localeCompare(b.name || '')));
                setLoading(false);
            },
            (err) => {
                console.error('Error loading assets:', err);
                setError('Could not load assets.');
                setLoading(false);
            }
        );
        return () => unsubscribe();
    }, []);

    return { assets, loading, error };
}

/** Every booking for one asset. Indexed on assetId in the rules. */
export function useBookingsForAsset(assetId) {
    const [bookings, setBookings] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!assetId) {
            setBookings([]);
            setLoading(false);
            return;
        }
        setLoading(true);

        const bookingsQuery = query(ref(database, 'bookings'), orderByChild('assetId'), equalTo(assetId));
        const unsubscribe = onValue(
            bookingsQuery,
            (snapshot) => {
                setBookings(toList(snapshot).sort((a, b) => a.start - b.start));
                setLoading(false);
            },
            (err) => {
                console.error('Error loading bookings for asset:', err);
                setLoading(false);
            }
        );
        return () => unsubscribe();
    }, [assetId]);

    return { bookings, loading };
}

/** Every booking in the system - the admin dashboard view. */
export function useAllBookings() {
    const [bookings, setBookings] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const unsubscribe = onValue(
            ref(database, 'bookings'),
            (snapshot) => {
                setBookings(toList(snapshot).sort((a, b) => b.start - a.start));
                setLoading(false);
            },
            (err) => {
                console.error('Error loading bookings:', err);
                setLoading(false);
            }
        );
        return () => unsubscribe();
    }, []);

    return { bookings, loading };
}

/** Bookings this user requested. */
export function useMyBookings(uid) {
    const [bookings, setBookings] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!uid) {
            setBookings([]);
            setLoading(false);
            return;
        }
        const myQuery = query(ref(database, 'bookings'), orderByChild('requesterUid'), equalTo(uid));
        const unsubscribe = onValue(
            myQuery,
            (snapshot) => {
                setBookings(toList(snapshot).sort((a, b) => b.start - a.start));
                setLoading(false);
            },
            (err) => {
                console.error('Error loading my bookings:', err);
                setLoading(false);
            }
        );
        return () => unsubscribe();
    }, [uid]);

    return { bookings, loading };
}

/** The global override approvers: Estate Manager and the Heads of Extramurals. */
export function useGlobalApprovers() {
    const [approvers, setApprovers] = useState({});
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const unsubscribe = onValue(
            ref(database, 'bookingApprovers'),
            (snapshot) => {
                setApprovers(snapshot.exists() ? snapshot.val() : {});
                setLoading(false);
            },
            () => setLoading(false)
        );
        return () => unsubscribe();
    }, []);

    return { approvers, loading };
}

/**
 * Everyone who has signed in, keyed by Firebase uid.
 *
 * This is the list approvers are chosen from: the security rules match on
 * auth.uid, and staff/ is keyed by push id, so staff records cannot be used here.
 */
export function useUsers() {
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const unsubscribe = onValue(
            ref(database, 'users'),
            (snapshot) => {
                setUsers(toList(snapshot).sort((a, b) => (a.name || a.email || '').localeCompare(b.name || b.email || '')));
                setLoading(false);
            },
            (err) => {
                console.error('Error loading users:', err);
                setLoading(false);
            }
        );
        return () => unsubscribe();
    }, []);

    return { users, loading };
}

/** Staff records, used to pick approvers by name rather than by raw UID. */
export function useStaff() {
    const [staff, setStaff] = useState([]);

    useEffect(() => {
        const unsubscribe = onValue(
            ref(database, 'staff'),
            (snapshot) => setStaff(toList(snapshot).sort((a, b) => (a.name || '').localeCompare(b.name || ''))),
            (err) => console.error('Error loading staff:', err)
        );
        return () => unsubscribe();
    }, []);

    return staff;
}
