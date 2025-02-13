import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './components/auth/AuthProvider';
import MaintenanceDashboard from './components/MaintenanceDashboard';
import Login from './components/auth/Login';

function App() {
  return (
    <Router basename="/school-maintenance">
      <AuthProvider>
        <div className="min-h-screen bg-gray-50">
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/" element={<MaintenanceDashboard />} />
          </Routes>
        </div>
      </AuthProvider>
    </Router>
  );
}

export default App;