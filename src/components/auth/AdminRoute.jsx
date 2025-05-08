// src/components/auth/AdminRoute.jsx
import React, { useState, useEffect } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from './AuthProvider';

export function AdminRoute({ children, isFullAdminOnly = false }) {
    const { user, userRole, loading } = useAuth();
    const location = useLocation();
    const [isAuthorized, setIsAuthorized] = useState(false);

    useEffect(() => {
        // Check if user has appropriate admin role
        if (isFullAdminOnly) {
            // Only full admins can access if isFullAdminOnly is true
            setIsAuthorized(userRole === 'admin');
        } else {
            // Both admins and supervisors can access
            setIsAuthorized(userRole === 'admin' || userRole === 'supervisor');
        }
    }, [user, userRole, isFullAdminOnly]);

    if (loading) {
        return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
    }

    if (!user) {
        // Redirect to login if not authenticated at all
        return <Navigate to="/login" state={{ from: location }} replace />;
    }

    if (!isAuthorized) {
        // Redirect to dashboard if authenticated but not authorized
        return <Navigate to="/" state={{ from: location }} replace />;
    }

    return children;
}