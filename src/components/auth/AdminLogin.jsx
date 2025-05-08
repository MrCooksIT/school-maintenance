// src/components/auth/AdminLogin.jsx
import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from './AuthProvider';

const AdminLogin = () => {
    const { signIn, userRole } = useAuth();
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const navigate = useNavigate();
    const location = useLocation();

    // Get the page they were trying to access
    const from = location.state?.from?.pathname || '/';

    const handleLogin = async () => {
        setIsLoading(true);
        setError('');

        try {
            // Use the regular signIn method
            await signIn();

            // Redirect based on role
            if (userRole === 'admin' || userRole === 'supervisor') {
                navigate(from);
            } else {
                setError("You don't have admin permissions");
                navigate('/');
            }
        } catch (error) {
            console.error('Login failed:', error);
            setError(error.message || "Authentication failed");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-100 py-12 px-4 sm:px-6 lg:px-8">
            <div className="max-w-md w-full space-y-8 bg-white p-10 rounded-xl shadow-lg">
                <div className="text-center">
                    <div className="mx-auto h-16 w-16 rounded-full bg-blue-100 flex items-center justify-center">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.618 5.984A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016zM12 9v2m0 4h.01" />
                        </svg>
                    </div>
                    <h2 className="mt-6 text-3xl font-extrabold text-gray-900">Admin Access</h2>
                    <p className="mt-2 text-sm text-gray-600">
                        Please sign in with your admin credentials
                    </p>
                </div>

                {error && (
                    <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
                        {error}
                    </div>
                )}

                <div className="flex flex-col gap-4">
                    <button
                        onClick={handleLogin}
                        disabled={isLoading}
                        className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
                    >
                        {isLoading ? 'Signing in...' : 'Sign in with Google'}
                    </button>

                    <button
                        onClick={() => navigate('/')}
                        className="text-sm text-blue-600 hover:text-blue-800"
                    >
                        Return to Dashboard
                    </button>
                </div>
            </div>
        </div>
    );
};

export default AdminLogin;