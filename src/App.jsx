// App.jsx
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './components/auth/AuthProvider';
import MaintenanceDashboard from './components/MaintenanceDashboard';
import Login from './components/auth/Login';
import { ProtectedRoute } from './components/auth/ProtectedRoute';
import RootLayout from './components/layout/RootLayout';
import Team from './components/admin/Team';          // Changed to default import
import Jobs from './components/admin/Jobs';          // Changed to default import
import Analytics from './components/admin/Analytics'; // Changed to default import
import Calendar from './components/admin/Calendar';   // Changed to default import
import Workload from './components/admin/Workload';  // Changed to default import
import Locations from './components/admin/Locations'; // Changed to default import

function App() {
  return (
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
                  <ProtectedRoute>
                    <Team />
                  </ProtectedRoute>
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
                  <ProtectedRoute>
                    <Analytics />
                  </ProtectedRoute>
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
                  <ProtectedRoute>
                    <Workload />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/locations"
                element={
                  <ProtectedRoute>
                    <Locations />
                  </ProtectedRoute>
                }
              />
            </Routes>
          </div>
        </RootLayout>
      </AuthProvider>
    </Router>
  );
}

export default App;