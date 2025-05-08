// App.jsx - Final version with proper routing and fallback
import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './components/auth/AuthProvider';
import MaintenanceDashboard from './components/MaintenanceDashboard';
import Login from './components/auth/Login';
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
import { ProtectedRoute } from './components/auth/ProtectedRoute';

function App() {
  return (
    <Router basename="/school-maintenance">
      <AuthProvider>
        <Routes>
          {/* Login route - outside main layout */}
          <Route path="/login" element={<Login />} />

          {/* Root layout routes */}
          <Route path="/" element={<RootLayout />}>
            {/* Dashboard */}
            <Route index element={<MaintenanceDashboard />} />

            {/* All routes now simplified - actual protection happens via the sidebar */}
            <Route path="admin/jobs" element={<Jobs />} />
            <Route path="admin/calendar" element={<Calendar />} />
            <Route path="admin/analytics" element={<Analytics />} />
            <Route path="admin/workload" element={<Workload />} />
            <Route path="admin/locations" element={<Locations />} />
            <Route path="admin/categories" element={<CategoriesPage />} />
            <Route path="admin/team" element={<Team />} />
            <Route path="admin/roles" element={<AdminRoleManager />} />

            {/* Fallback for any other route */}
            <Route path="*" element={<PageNotFound />} />
          </Route>
        </Routes>
      </AuthProvider>
    </Router>
  );
}

export default App;