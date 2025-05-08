// App.jsx with restored authentication checks
import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './components/auth/AuthProvider';
import MaintenanceDashboard from './components/MaintenanceDashboard';
import Login from './components/auth/Login';
import AdminLogin from './components/auth/AdminLogin';
import { ProtectedRoute } from './components/auth/ProtectedRoute';
import { AdminRoute } from './components/auth/AdminRoute';
import RootLayout from './components/layout/RootLayout';
import Team from './components/admin/Team';
import Jobs from './components/admin/Jobs';
import Analytics from './components/admin/Analytics';
import Calendar from './components/admin/Calendar';
import Workload from './components/admin/Workload';
import Locations from './components/admin/Locations';
import CategoriesPage from './components/admin/CategoriesPage';
import AdminRoleManager from './components/admin/AdminRoleManager';
import PageNotFound from './components/PageNotFound';

function App() {
  return (
    <Router basename="/school-maintenance">
      <AuthProvider>
        <Routes>
          {/* Login route - outside main layout */}
          <Route path="/login" element={<Login />} />
          <Route path="/admin/login" element={<AdminLogin />} />

          {/* Root layout routes - ALL protected with ProtectedRoute */}
          <Route path="/" element={
            <ProtectedRoute>
              <RootLayout />
            </ProtectedRoute>
          }>
            {/* Dashboard */}
            <Route index element={<MaintenanceDashboard />} />

            {/* Regular user routes */}
            <Route path="admin/jobs" element={<Jobs />} />
            <Route path="admin/calendar" element={<Calendar />} />

            {/* Admin routes - protected with AdminRoute */}
            <Route path="admin/analytics" element={
              <AdminRoute>
                <Analytics />
              </AdminRoute>
            } />
            <Route path="admin/workload" element={
              <AdminRoute>
                <Workload />
              </AdminRoute>
            } />
            <Route path="admin/locations" element={
              <AdminRoute>
                <Locations />
              </AdminRoute>
            } />
            <Route path="admin/categories" element={
              <AdminRoute>
                <CategoriesPage />
              </AdminRoute>
            } />
            <Route path="admin/team" element={
              <AdminRoute>
                <Team />
              </AdminRoute>
            } />
            <Route path="admin/roles" element={
              <AdminRoute isFullAdminOnly={true}>
                <AdminRoleManager />
              </AdminRoute>
            } />

            {/* Fallback for any other route */}
            <Route path="*" element={<PageNotFound />} />
          </Route>
        </Routes>
      </AuthProvider>
    </Router>
  );
}

export default App;