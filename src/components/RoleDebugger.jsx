// RoleDebugger.jsx
import React from 'react';
import { useAuth } from './auth/AuthProvider';

const RoleDebugger = () => {
    const { user, userRole } = useAuth();

    return (
        <div className="p-2 m-2 bg-gray-100 rounded-md text-sm">
            <h3 className="font-bold">Auth Debug</h3>
            <p>User: {user ? user.email : 'Not logged in'}</p>
            <p>Role: {userRole || 'none'}</p>
            <p>User ID: {user ? user.uid : 'none'}</p>
        </div>
    );
};

export default RoleDebugger;