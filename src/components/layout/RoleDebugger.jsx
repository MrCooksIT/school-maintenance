// src/components/RoleDebugger.jsx - Enhanced with direct DB check
import React, { useState, useEffect } from 'react';
import { useAuth } from '@/components/auth/AuthProvider';
import { database } from '@/config/firebase';
import { ref, get } from 'firebase/database';

const RoleDebugger = () => {
    const { user, userRole, refreshUserRole } = useAuth();
    const [refreshing, setRefreshing] = useState(false);
    const [dbData, setDbData] = useState(null);
    const [showDbData, setShowDbData] = useState(false);

    // Directly check database when component mounts
    useEffect(() => {
        if (user) {
            checkDatabase(user.uid);
        }
    }, [user]);

    const checkDatabase = async (userId) => {
        try {
            const results = {};

            // Check admins collection
            const adminRef = ref(database, `admins/${userId}`);
            const adminSnapshot = await get(adminRef);
            results.admin = adminSnapshot.exists() ? adminSnapshot.val() : null;

            // Check staff collection
            const staffRef = ref(database, `staff/${userId}`);
            const staffSnapshot = await get(staffRef);
            results.staff = staffSnapshot.exists() ? staffSnapshot.val() : null;

            console.log("Database check results:", results);
            setDbData(results);
        } catch (error) {
            console.error("Error checking database:", error);
        }
    };

    const handleRefresh = async () => {
        if (refreshUserRole) {
            setRefreshing(true);
            try {
                await refreshUserRole();
                console.log("Manual role refresh completed");

                // Also recheck database
                if (user) {
                    await checkDatabase(user.uid);
                }
            } catch (error) {
                console.error("Error refreshing role:", error);
            } finally {
                setRefreshing(false);
            }
        }
    };

    return (
        <div className="p-3 bg-red-100 border-2 border-red-500 rounded-md text-sm shadow-lg">
            <h3 className="font-bold text-red-800 mb-2">🔐 AUTH DEBUG</h3>
            <div className="space-y-1">
                <p><strong>User:</strong> {user ? user.email : 'Not logged in'}</p>
                <p><strong>User ID:</strong> {user ? user.uid : 'none'}</p>
                <p><strong>Role:</strong> <span className="font-bold">{userRole || 'none'}</span></p>
            </div>
            <div className="flex gap-2 mt-2">
                <button
                    onClick={handleRefresh}
                    disabled={refreshing}
                    className="px-3 py-1 bg-blue-500 text-white rounded-md text-xs hover:bg-blue-600 disabled:opacity-50"
                >
                    {refreshing ? "Refreshing..." : "Refresh Role"}
                </button>

                <button
                    onClick={() => setShowDbData(!showDbData)}
                    className="px-3 py-1 bg-green-500 text-white rounded-md text-xs hover:bg-green-600"
                >
                    {showDbData ? "Hide DB Data" : "Show DB Data"}
                </button>
            </div>

            {/* Show database data if available and requested */}
            {showDbData && dbData && (
                <div className="mt-2 p-2 bg-white rounded border border-gray-300 text-xs">
                    <h4 className="font-bold">Database Records:</h4>
                    <p><strong>Admin Record:</strong> {dbData.admin ? "Found" : "Not Found"}</p>
                    {dbData.admin && (
                        <div className="pl-2 mt-1">
                            <p>Role: {dbData.admin.role || "none"}</p>
                            <p>Email: {dbData.admin.email || "none"}</p>
                        </div>
                    )}
                    <p className="mt-1"><strong>Staff Record:</strong> {dbData.staff ? "Found" : "Not Found"}</p>
                    {dbData.staff && (
                        <div className="pl-2 mt-1">
                            <p>Role: {dbData.staff.role || "none"}</p>
                            <p>Email: {dbData.staff.email || "none"}</p>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default RoleDebugger;