// src/components/auth/AuthProvider.jsx - Comprehensive fix
import { createContext, useContext, useEffect, useState } from 'react';
import { auth, database } from '../../config/firebase';
import { ref, get, set, update, onValue } from 'firebase/database';
import { useNavigate, useLocation } from 'react-router-dom';
import {
    signInWithPopup,
    GoogleAuthProvider,
    signOut as firebaseSignOut
} from 'firebase/auth';

const AuthContext = createContext({});

// List of admin-only routes
const ADMIN_ROUTES = [
    '/admin/analytics',
    '/admin/workload',
    '/admin/locations',
    '/admin/categories',
    '/admin/team'
];

// List of full-admin-only routes
const FULL_ADMIN_ROUTES = [
    '/admin/roles'
];

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [userRole, setUserRole] = useState(null);
    const navigate = useNavigate();
    const location = useLocation();

    // Add debug logging for role changes
    useEffect(() => {
        console.log("User role changed:", userRole);
    }, [userRole]);

    // Navigation guard effect
    useEffect(() => {
        // Skip during loading
        if (loading) return;

        // If the user is not logged in and not on login page, redirect to login
        if (!user && !['/login', '/admin/login'].includes(location.pathname)) {
            navigate('/login', { replace: true });
            return;
        }

        // If user is logged in and on a login page, redirect to dashboard
        if (user && ['/login', '/admin/login'].includes(location.pathname)) {
            navigate('/', { replace: true });
            return;
        }

        // Check admin route access
        if (user && ADMIN_ROUTES.some(route => location.pathname.startsWith(route))) {
            if (userRole !== 'admin' && userRole !== 'supervisor') {
                console.log('Access denied: Admin-only route');
                navigate('/', { replace: true });
                return;
            }
        }

        // Check full admin route access
        if (user && FULL_ADMIN_ROUTES.some(route => location.pathname.startsWith(route))) {
            if (userRole !== 'admin') {
                console.log('Access denied: Full admin-only route');
                navigate('/', { replace: true });
                return;
            }
        }
    }, [user, loading, userRole, location.pathname, navigate]);

    // Function to manually fetch and update user role
    const fetchAndUpdateUserRole = async (userId) => {
        if (!userId) return 'staff';

        try {
            console.log("Fetching role for user ID:", userId);

            // First check admin collection
            const adminRef = ref(database, `admins/${userId}`);
            const adminSnapshot = await get(adminRef);

            if (adminSnapshot.exists()) {
                const role = adminSnapshot.val().role || 'admin';
                console.log(`User ${userId} found in admins collection with role:`, role);
                setUserRole(role);
                return role;
            }

            // Then check staff collection
            const staffRef = ref(database, `staff/${userId}`);
            const staffSnapshot = await get(staffRef);

            if (staffSnapshot.exists()) {
                const role = staffSnapshot.val().role || 'staff';
                console.log(`User ${userId} found in staff collection with role:`, role);
                setUserRole(role);
                return role;
            }

            console.log(`User ${userId} not found in admins or staff collections, defaulting to 'staff'`);
            setUserRole('staff');
            return 'staff';
        } catch (error) {
            console.error("Error fetching user role:", error);
            setUserRole('staff');
            return 'staff';
        }
    };

    // Listen for role changes in real-time
    useEffect(() => {
        if (!user) return;

        console.log("Setting up role listeners for user:", user.uid);

        // IMPORTANT: Manual immediate role check
        fetchAndUpdateUserRole(user.uid);

        // Listen for admin role changes
        const adminRef = ref(database, `admins/${user.uid}`);
        const unsubscribeAdmin = onValue(adminRef, (snapshot) => {
            if (snapshot.exists()) {
                const adminData = snapshot.val();
                console.log("Admin role change detected for", user.email, "- new role:", adminData.role);
                setUserRole(adminData.role || 'admin');
            } else {
                // If not in admins, check staff collection
                const staffRef = ref(database, `staff/${user.uid}`);
                const unsubscribeStaff = onValue(staffRef, (snapshot) => {
                    if (snapshot.exists() && snapshot.val().role) {
                        const staffRole = snapshot.val().role;
                        console.log("Staff role change detected for", user.email, "- new role:", staffRole);
                        setUserRole(staffRole);
                    } else {
                        console.log("User not in admins or staff collections, setting as staff");
                        setUserRole('staff');
                    }
                });

                // Clean up staff listener if admin listener is removed
                return () => unsubscribeStaff();
            }
        }, (error) => {
            console.error("Error in admin role listener:", error);
        });

        return () => {
            console.log("Cleaning up role listeners");
            unsubscribeAdmin();
        };
    }, [user]);

    // Auth state change
    useEffect(() => {
        const unsubscribe = auth.onAuthStateChanged(async (authUser) => {
            console.log("Auth state changed:", authUser ? authUser.email : "logged out");
            setUser(authUser);

            if (authUser) {
                // Do not set role here, it will be set by the real-time listener
            } else {
                setUserRole(null);
            }

            setLoading(false);
        });

        return unsubscribe;
    }, []);

    // Function to manually refresh the user role
    const refreshUserRole = async () => {
        if (!user) return;

        console.log("Manually refreshing role for user:", user.email);
        return await fetchAndUpdateUserRole(user.uid);
    };

    const signIn = async () => {
        const provider = new GoogleAuthProvider();
        try {
            console.log("Starting Google sign in...");
            const result = await signInWithPopup(auth, provider);
            console.log("Sign in successful for:", result.user.email);

            // Role will be set by the real-time listener
            return result.user;
        } catch (error) {
            console.error("Auth Error:", error);
            throw error;
        }
    };

    const signOut = () => {
        return firebaseSignOut(auth).then(() => {
            setUserRole(null);
            navigate('/login');
        });
    };

    // Check if user has admin privileges
    const isAdmin = () => {
        return userRole === 'admin' || userRole === 'supervisor';
    };

    const value = {
        user,
        loading,
        signIn,
        signOut,
        userRole,
        isAdmin,
        refreshUserRole
    };

    return (
        <AuthContext.Provider value={value}>
            {!loading && children}
        </AuthContext.Provider>
    );
}

export const useAuth = () => {
    return useContext(AuthContext);
};