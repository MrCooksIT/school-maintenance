// App.jsx
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

function App() {
  return (
    <Router basename="/school-maintenance">
      <AuthProvider>
        <Routes>
          {/* Public Routes */}
          <Route path="/login" element={<Login />} />
          <Route path="/admin/login" element={<AdminLogin />} />

          {/* Root Layout with Nested Routes */}
          <Route path="/" element={<RootLayout />}>
            {/* Regular User Routes */}
            <Route index element={
              <ProtectedRoute>
                <MaintenanceDashboard />
              </ProtectedRoute>
            } />

            <Route path="admin/jobs" element={
              <ProtectedRoute>
                <Jobs />
              </ProtectedRoute>
            } />

            <Route path="admin/calendar" element={
              <ProtectedRoute>
                <Calendar />
              </ProtectedRoute>
            } />

            {/* Admin Only Routes */}
            <Route path="admin/team" element={
              <AdminRoute>
                <Team />
              </AdminRoute>
            } />

            <Route path="admin/analytics" element={
              <AdminRoute>
                <Analytics />
              </AdminRoute>
            } />

            <Route path="admin/categories" element={
              <AdminRoute>
                <CategoriesPage />
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

            {/* Catch-all redirect */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
      </AuthProvider>
    </Router>
  );
}

export default App;