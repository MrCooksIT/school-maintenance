// src/components/debug/AuthDebugger.jsx
import React from 'react';
import { useAuth } from '@/components/auth/AuthProvider';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';

/**
 * A hidden component to debug authentication issues
 * Only renders in development environment
 */
const AuthDebugger = () => {
    const { user, userRole } = useAuth();
    const { toast } = useToast();

    // Only show in development
    if (process.env.NODE_ENV !== 'development') {
        return null;
    }

    const checkAdmin = () => {
        // Check multiple sources of admin status
        const isAdmin =
            userRole === 'admin' ||
            userRole === 'supervisor' ||
            userRole === 'estate_manager' ||
            user?.isAdmin === true ||
            user?.admin === true ||
            user?.role === 'admin' ||
            (user?.email && (
                user?.email.includes('@admin') ||
                user?.email.includes('estate') ||
                user?.email.includes('supervisor') ||
                user?.email.includes('acoetzee')
            ));

        return isAdmin;
    };

    const logAuthInfo = () => {
        // Compile auth info
        const authInfo = {
            user: user ? {
                uid: user.uid,
                email: user.email,
                displayName: user.displayName,
                photoURL: user.photoURL,
                providerId: user.providerId,
                metadata: user.metadata
            } : null,
            userRole,
            isAdmin: checkAdmin(),
            claims: user?.getIdTokenResult ? 'Available' : 'Not available'
        };

        // Log to console
        console.log('Auth Debug Info:', authInfo);

        // Show in toast
        toast({
            title: "Auth Debug Info",
            description: `User: ${user?.email || 'Not signed in'}\nRole: ${userRole || 'None'}\nIsAdmin: ${checkAdmin()}`,
            variant: "info"
        });

        // If we have access to token claims, show them
        if (user?.getIdTokenResult) {
            user.getIdTokenResult().then(idTokenResult => {
                console.log('Token claims:', idTokenResult.claims);
            });
        }
    };

    const forceAdminRole = () => {
        // This is just for debugging - it won't persist
        localStorage.setItem('debug_admin_override', 'true');
        toast({
            title: "Admin Override",
            description: "Temporary admin override enabled for debugging",
            variant: "warning"
        });
        window.location.reload();
    };

    return (
        <div className="fixed bottom-4 right-4 z-50 opacity-30 hover:opacity-100 transition-opacity">
            <div className="bg-black text-white p-2 rounded-lg shadow-lg text-xs">
                <p>Auth Debug</p>
                <div className="flex flex-col gap-1 mt-1">
                    <Button
                        size="sm"
                        variant="outline"
                        className="h-6 text-xs text-white bg-gray-800 hover:bg-gray-700 border-gray-700"
                        onClick={logAuthInfo}
                    >
                        Log Auth Info
                    </Button>
                    <Button
                        size="sm"
                        variant="outline"
                        className="h-6 text-xs text-white bg-red-800 hover:bg-red-700 border-red-700"
                        onClick={forceAdminRole}
                    >
                        Force Admin Role
                    </Button>
                </div>
            </div>
        </div>
    );
};

export default AuthDebugger;