import React from 'react';
import { HashRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './components/auth/AuthProvider';
import MaintenanceDashboard from './components/MaintenanceDashboard';
import Login from './components/auth/Login';
import AdminLogin from './components/auth/AdminLogin';
import { ProtectedRoute } from './components/auth/ProtectedRoute';
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
import ReopenRequestsManager from './components/admin/ReopenRequestsManager';
import PublicTicketForm from './components/public/PublicTicketForm';


function App() {
  return (
    <Router>
      <AuthProvider>
        <Routes>
          {/* Public routes */}
          <Route path="/submit-ticket" element={<PublicTicketForm />} />
          <Route path="/login" element={<Login />} />
          <Route path="/admin/login" element={<AdminLogin />} />

          {/* Protected routes layout */}
          <Route element={
            <ProtectedRoute>
              <RootLayout />
            </ProtectedRoute>
          }>
            {/* Dashboard */}
            <Route index element={<MaintenanceDashboard />} />

            {/* All admin routes - access control is handled by the sidebar visibility */}
            <Route path="admin/jobs" element={<Jobs />} />
            <Route path="admin/calendar" element={<Calendar />} />
            <Route path="admin/analytics" element={<Analytics />} />
            <Route path="admin/workload" element={<Workload />} />
            <Route path="admin/locations" element={<Locations />} />
            <Route path="admin/categories" element={<CategoriesPage />} />
            <Route path="admin/team" element={<Team />} />
            <Route path="admin/roles" element={<AdminRoleManager />} />
            <Route path="admin/reopen-requests" element={<ReopenRequestsManager />} />

            {/* Fallback */}
            <Route path="*" element={<PageNotFound />} />
          </Route>
        </Routes>
      </AuthProvider>
    </Router>
  );
}

export default App;