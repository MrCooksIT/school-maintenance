import React from 'react';
import { useAuth } from './AuthProvider';

function Login() {
    const { signIn } = useAuth();

    return (
        <div className="min-h-screen flex items-center justify-center">
            <button
                onClick={signIn}
                className="bg-blue-500 text-white px-4 py-2 rounded"
            >
                Sign in with Google
            </button>
        </div>
    );
}

export default Login;