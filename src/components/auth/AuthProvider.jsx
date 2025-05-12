// src/components/auth/AuthProvider.jsx with role-based navigation guard
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

const DEFAULT_ADMIN_EMAIL = 'acoetzee@maristsj.co.za';

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [userRole, setUserRole] = useState(null);
    const navigate = useNavigate();
    const location = useLocation();

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

    // Function to fetch user role from the database
    const fetchUserRole = async (userId, userEmail) => {
        try {
            // First check if user is in admin collection
            const adminRef = ref(database, `admins/${userId}`);
            const adminSnapshot = await get(adminRef);

            if (adminSnapshot.exists()) {
                // User is an admin
                return adminSnapshot.val().role || 'admin';
            }

            // Then check staff collection
            const staffRef = ref(database, `staff/${userId}`);
            const staffSnapshot = await get(staffRef);

            if (staffSnapshot.exists()) {
                // User is staff, check if they have a role
                return staffSnapshot.val().role || 'staff';
            }

            // If not found in either collection and is the default admin email,
            // set up default admin access
            if (userEmail === DEFAULT_ADMIN_EMAIL) {
                await setupDefaultAdmin(userId, userEmail);
                return 'admin';
            }

            // Default role
            return 'staff';
        } catch (error) {
            console.error("Error fetching user role:", error);
            return 'staff'; // Default to staff on error
        }
    };
    useEffect(() => {
        if (!user) return;

        console.log("Setting up role listeners for user:", user.uid);

        // Listen for changes in the admins collection for this user
        const adminRef = ref(database, `admins/${user.uid}`);
        const unsubscribeAdmin = onValue(adminRef, (snapshot) => {
            if (snapshot.exists()) {
                const adminData = snapshot.val();
                console.log("Admin role change detected:", adminData.role);
                // Update the role state
                setUserRole(adminData.role);
            } else {
                // If removed from admins, check staff role
                const staffRef = ref(database, `staff/${user.uid}`);
                const unsubscribeStaff = onValue(staffRef, (snapshot) => {
                    if (snapshot.exists()) {
                        const staffData = snapshot.val();
                        console.log("Staff role change detected:", staffData.role);
                        setUserRole(staffData.role || 'staff');
                    } else {
                        console.log("User not found in admin or staff collections");
                        setUserRole('staff'); // Default role
                    }
                });

                return () => unsubscribeStaff();
            }
        });

        return () => {
            console.log("Cleaning up role listeners");
            unsubscribeAdmin();
        };
    }, [user]);

    useEffect(() => {
        if (!user) return;

        console.log("Setting up role listener for user:", user.uid);

        // Listen to the user's entry in the admins collection
        const userAdminRef = ref(database, `admins/${user.uid}`);
        const unsubscribeAdmin = onValue(userAdminRef, (snapshot) => {
            if (snapshot.exists()) {
                console.log("User is in admins collection, role:", snapshot.val().role);
                setUserRole(snapshot.val().role || 'admin');
            } else {
                // If removed from admins, check staff collection
                const userStaffRef = ref(database, `staff/${user.uid}`);
                const unsubscribeStaff = onValue(userStaffRef, (snapshot) => {
                    if (snapshot.exists() && snapshot.val().role) {
                        console.log("User is in staff collection, role:", snapshot.val().role);
                        setUserRole(snapshot.val().role);
                    } else {
                        console.log("User is not admin or has no special role");
                        setUserRole('staff');
                    }
                });

                return () => unsubscribeStaff();
            }
        });

        return () => unsubscribeAdmin();
    }, [user]);
    // Function to set up default admin account
    const setupDefaultAdmin = async (userId, userEmail) => {
        try {
            // Check if this user is already in the admins collection
            const adminRef = ref(database, `admins/${userId}`);
            const snapshot = await get(adminRef);

            if (!snapshot.exists()) {
                // Only set up the default admin if not already done
                await set(adminRef, {
                    email: userEmail,
                    name: 'Default Admin',
                    role: 'admin',
                    permissions: {
                        canManageUsers: true,
                        canManageCategories: true,
                        canManageLocations: true,
                        canViewAnalytics: true,
                        canViewWorkload: true
                    },
                    isDefaultAdmin: true,
                    createdAt: new Date().toISOString()
                });

                // Also ensure the user is in staff collection
                const staffRef = ref(database, `staff/${userId}`);
                const staffSnapshot = await get(staffRef);

                if (!staffSnapshot.exists()) {
                    await set(staffRef, {
                        name: 'Default Admin',
                        email: userEmail,
                        department: 'Administration',
                        role: 'admin',
                        createdAt: new Date().toISOString()
                    });
                }

                console.log("Default admin set up successfully for", userEmail);
            }
            return true;
        } catch (error) {
            console.error("Error setting up default admin:", error);
            return false;
        }
    };

    useEffect(() => {
        const unsubscribe = auth.onAuthStateChanged(async (authUser) => {
            setUser(authUser);

            if (authUser) {
                // Log the user's email - helpful for debugging
                console.log(`User authenticated: ${authUser.email}`);

                // Check if this is the default admin email
                const isDefaultAdmin = authUser.email === DEFAULT_ADMIN_EMAIL;
                if (isDefaultAdmin) {
                    console.log("Default admin email detected!");
                }

                // Fetch user role when authenticated
                const role = await fetchUserRole(authUser.uid, authUser.email);
                setUserRole(role);

                console.log(`User role set to: ${role}`);
            } else {
                setUserRole(null);
            }

            setLoading(false);
        });

        return unsubscribe;
    }, []);

    const signIn = async () => {
        const provider = new GoogleAuthProvider();
        try {
            const result = await signInWithPopup(auth, provider);

            // After successful sign-in, get the user role
            const role = await fetchUserRole(result.user.uid, result.user.email);
            setUserRole(role);

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