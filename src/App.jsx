// App.jsx
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './components/auth/AuthProvider';
import MaintenanceDashboard from './components/MaintenanceDashboard';
import Login from './components/auth/Login';
import { ProtectedRoute } from './components/auth/ProtectedRoute';
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
                path="admin/categories"
                element={<ProtectedRoute>
                  <CategoriesPage />
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
      <Toaster />
    </>

  );
}

export default App;