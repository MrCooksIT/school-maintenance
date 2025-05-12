// src/components/RoleDebugger.jsx
import React from 'react';
import { useAuth } from '../auth/AuthProvider';


const RoleDebugger = () => {
    const { user, userRole, refreshUserRole } = useAuth();

    // Add a refresh function if available
    const handleRefresh = () => {
        if (refreshUserRole) {
            refreshUserRole();
            console.log("Manually refreshing user role");
        } else {
            console.log("refreshUserRole function not available");
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
            {refreshUserRole && (
                <button
                    onClick={handleRefresh}
                    className="mt-2 px-3 py-1 bg-blue-500 text-white rounded-md text-xs hover:bg-blue-600"
                >
                    Refresh Role
                </button>
            )}
        </div>
    );
};

export default RoleDebugger;