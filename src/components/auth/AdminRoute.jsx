// src/components/auth/AdminRoute.jsx
import React, { useState, useEffect } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from './AuthProvider';

export function AdminRoute({ children }) {
    const { user, userRole, loading } = useAuth();
    const location = useLocation();
    const [isAdmin, setIsAdmin] = useState(false);

    useEffect(() => {
        // Check if user has admin role
        if (userRole === 'admin' || userRole === 'supervisor') {
            setIsAdmin(true);
        }
    }, [user, userRole]);

    if (loading) {
        return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
    }

    if (!user) {
        // Redirect to login if not authenticated at all
        return <Navigate to="/login" state={{ from: location }} replace />;
    }

    if (!isAdmin) {
        // Redirect to dashboard if authenticated but not admin
        return <Navigate to="/" state={{ from: location }} replace />;
    }

    return children;
}