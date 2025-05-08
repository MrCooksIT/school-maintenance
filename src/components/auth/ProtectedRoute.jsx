// src/components/auth/ProtectedRoute.jsx
import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from './AuthProvider';

export function ProtectedRoute({ children }) {
    const { user, loading } = useAuth();
    const location = useLocation();

    // Show loading indicator while checking authentication
    if (loading) {
        return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
    }

    // Redirect to login if not authenticated
    if (!user) {
        // Save the location they were trying to access for later redirect
        return <Navigate to="/login" state={{ from: location }} replace />;
    }

    // Render children if authenticated
    return children;
}