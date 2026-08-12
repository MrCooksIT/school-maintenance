// src/components/admin/useMaintenanceStaff.js
//
// The maintenanceStaff/{uid} allow-list. Readable in full only by admins, which
// is why this hook lives with the admin screens rather than in AuthProvider -
// AuthProvider reads only the current user's own entry.

import { useState, useEffect } from 'react';
import { ref, onValue } from 'firebase/database';
import { database } from '@/config/firebase';

export function useMaintenanceStaff() {
    const [maintenanceStaff, setMaintenanceStaff] = useState({});
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const unsubscribe = onValue(
            ref(database, 'maintenanceStaff'),
            (snapshot) => {
                setMaintenanceStaff(snapshot.exists() ? snapshot.val() : {});
                setLoading(false);
            },
            (error) => {
                console.error('Error loading maintenance access list:', error);
                setMaintenanceStaff({});
                setLoading(false);
            }
        );
        return () => unsubscribe();
    }, []);

    return { maintenanceStaff, loading };
}
