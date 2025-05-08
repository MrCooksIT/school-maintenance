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
        // This assumes your AuthProvider exposes a userRole property
        // You might need to modify this based on your actual authentication system
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

// Modified App.jsx with protected admin routes
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './components/auth/AuthProvider';
import MaintenanceDashboard from './components/MaintenanceDashboard';
import Login from './components/auth/Login';
import { ProtectedRoute } from './components/auth/ProtectedRoute';
import { AdminRoute } from './components/auth/AdminRoute'; // Import the new AdminRoute
import RootLayout from './components/layout/RootLayout';
import Team from './components/admin/Team';
import Jobs from './components/admin/Jobs';
import Analytics from './components/admin/Analytics';
import Calendar from './components/admin/Calendar';
import Workload from './components/admin/Workload';
import Locations from './components/admin/Locations';
import CategoriesPage from './components/admin/CategoriesPage';
import { Toaster } from "@/components/Toaster"

function App() {
    return (
        <>
            <Router basename="/school-maintenance">
                <AuthProvider>
                    <RootLayout>
                        <div className="min-h-screen bg-gray-50">
                            <Routes>
                                <Route path="/login" element={<Login />} />
                                <Route
                                    path="/"
                                    element={
                                        <ProtectedRoute>
                                            <MaintenanceDashboard />
                                        </ProtectedRoute>
                                    }
                                />
                                <Route
                                    path="/admin/team"
                                    element={
                                        <AdminRoute>
                                            <Team />
                                        </AdminRoute>
                                    }
                                />
                                <Route
                                    path="/admin/jobs"
                                    element={
                                        <ProtectedRoute>
                                            <Jobs />
                                        </ProtectedRoute>
                                    }
                                />
                                <Route
                                    path="/admin/analytics"
                                    element={
                                        <AdminRoute>
                                            <Analytics />
                                        </AdminRoute>
                                    }
                                />
                                <Route
                                    path="admin/categories"
                                    element={
                                        <AdminRoute>
                                            <CategoriesPage />
                                        </AdminRoute>
                                    }
                                />
                                <Route
                                    path="/admin/calendar"
                                    element={
                                        <ProtectedRoute>
                                            <Calendar />
                                        </ProtectedRoute>
                                    }
                                />
                                <Route
                                    path="/admin/workload"
                                    element={
                                        <AdminRoute>
                                            <Workload />
                                        </AdminRoute>
                                    }
                                />
                                <Route
                                    path="/admin/locations"
                                    element={
                                        <AdminRoute>
                                            <Locations />
                                        </AdminRoute>
                                    }
                                />
                            </Routes>
                        </div>
                    </RootLayout>
                </AuthProvider>
            </Router>
            <Toaster />
        </>
    );
}

export default App;