// src/components/auth/AdminLogin.jsx
import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from './AuthProvider';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Lock, User, Shield } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';

const AdminLogin = () => {
    const { signIn, userRole } = useAuth();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const navigate = useNavigate();
    const location = useLocation();
    const { toast } = useToast();

    // Get the page they were trying to access
    const from = location.state?.from?.pathname || '/';

    const handleLogin = async (e) => {
        e.preventDefault();
        setIsLoading(true);

        try {
            // Use the regular signIn method
            await signIn();

            // Redirect based on role
            if (userRole === 'admin' || userRole === 'supervisor') {
                navigate(from);
                toast({
                    title: "Admin Login Successful",
                    description: "Welcome to the admin panel",
                    variant: "success",
                });
            } else {
                toast({
                    title: "Access Denied",
                    description: "You don't have admin permissions",
                    variant: "destructive",
                });
                navigate('/');
            }
        } catch (error) {
            console.error('Login failed:', error);
            toast({
                title: "Login Failed",
                description: error.message || "Authentication failed",
                variant: "destructive",
            });
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-100 py-12 px-4 sm:px-6 lg:px-8">
            <div className="max-w-md w-full space-y-8 bg-white p-10 rounded-xl shadow-lg">
                <div className="text-center">
                    <div className="mx-auto h-16 w-16 rounded-full bg-blue-100 flex items-center justify-center">
                        <Shield className="h-10 w-10 text-blue-600" />
                    </div>
                    <h2 className="mt-6 text-3xl font-extrabold text-gray-900">Admin Access</h2>
                    <p className="mt-2 text-sm text-gray-600">
                        Please sign in with your admin credentials
                    </p>
                </div>

                <form className="mt-8 space-y-6" onSubmit={handleLogin}>
                    <div className="rounded-md shadow-sm space-y-4">
                        <div className="relative">
                            <User className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                            <Input
                                id="email-address"
                                name="email"
                                type="email"
                                autoComplete="email"
                                required
                                className="pl-10"
                                placeholder="Email address"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                            />
                        </div>
                        <div className="relative">
                            <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                            <Input
                                id="password"
                                name="password"
                                type="password"
                                autoComplete="current-password"
                                required
                                className="pl-10"
                                placeholder="Password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                            />
                        </div>
                    </div>

                    <Button
                        type="submit"
                        className="w-full bg-blue-600 hover:bg-blue-700"
                        disabled={isLoading}
                    >
                        {isLoading ? (
                            <span className="flex items-center justify-center">
                                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                                Signing in...
                            </span>
                        ) : (
                            <span>Sign in</span>
                        )}
                    </Button>

                    <div className="text-center mt-4">
                        <Button
                            variant="link"
                            className="text-sm text-blue-600 hover:text-blue-800"
                            onClick={() => navigate('/')}
                        >
                            Return to Dashboard
                        </Button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default AdminLogin;