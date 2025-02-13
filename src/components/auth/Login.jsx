// src/components/auth/Login.jsx
import { useNavigate } from 'react-router-dom';
import { useAuth } from './AuthProvider';

function Login() {
    const { signIn } = useAuth();
    const navigate = useNavigate();

    const handleLogin = async () => {
        try {
            await signIn();
            navigate('/');
        } catch (error) {
            console.error('Login failed:', error);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
            <div className="max-w-md w-full space-y-8">
                <div>
                    <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
                        School Maintenance System
                    </h2>
                    <p className="mt-2 text-center text-sm text-gray-600">
                        Sign in with your school account
                    </p>
                </div>
                <div>
                    <button
                        onClick={handleLogin}
                        className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                    >
                        Sign in with Google
                    </button>
                </div>
            </div>
        </div>
    );
}

export default Login;