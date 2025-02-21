import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './components/auth/AuthProvider';
import MaintenanceDashboard from './components/MaintenanceDashboard';
import Login from './components/auth/Login';
import { ProtectedRoute } from './components/auth/ProtectedRoute';
import RootLayout from './components/layout/RootLayout';

function App() {
  return (
    <Router basename="/school-maintenance">
      <AuthProvider>
        <RootLayout>
          <div className="min-h-screen bg-gray-50">
            <Routes>
              <Route path="/login" element={<Login />} />
              <Route path="/" element={<ProtectedRoute><MaintenanceDashboard /></ProtectedRoute>} />
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