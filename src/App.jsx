import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './components/auth/AuthProvider';
import MaintenanceDashboard from './components/MaintenanceDashboard';
import Login from './components/auth/Login';
import { ProtectedRoute } from './components/auth/ProtectedRoute';
import RootLayout from './components/layout/RootLayout';
import { Team } from './components/admin/Team';
import { Jobs } from './components/admin/Jobs';
import { Analytics } from './components/admin/Analytics';
import { Calendar } from './components/admin/Calendar';
import { Workload } from './components/admin/Workload';
import { Locations } from './components/admin/Locations';
function App() {
  return (
    <Router basename="/school-maintenance">
      <AuthProvider>
        <RootLayout>
          <div className="min-h-screen bg-gray-50">
            <Routes>
              <Route path="/login" element={<Login />} />
              <Route path="/" element={<ProtectedRoute><MaintenanceDashboard /></ProtectedRoute>} />
              <Route path="/admin/team" element={<Team />} />
              <Route path="/admin/jobs" element={<Jobs />} />
              <Route path="/admin/analytics" element={<Analytics />} />
              <Route path="/admin/calendar" element={<Calendar />} />
              <Route path="/admin/workload" element={<Workload />} />
              <Route path="/admin/locations" element={<Locations />} />
              <Route
                path="/"
                element={
                  <ProtectedRoute>
                    <MaintenanceDashboard />
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