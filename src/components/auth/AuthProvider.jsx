// src/components/auth/AuthProvider.jsx
import { createContext, useContext, useEffect, useState } from 'react';
import { auth, database } from '../../config/firebase';
import { ref, get, set, update, onValue } from 'firebase/database';
import {
    signInWithPopup,
    GoogleAuthProvider,
    signOut as firebaseSignOut
} from 'firebase/auth';

const AuthContext = createContext({});

const DEFAULT_ADMIN_EMAIL = 'acoetzee@maristsj.co.za';

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [userRole, setUserRole] = useState(null);

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

    // Function to set up default admin account
    const setupDefaultAdmin = async (userId, userEmail) => {
        try {
            console.log(`Setting up default admin account for ${userEmail}`);

            // Add user to admins collection
            const adminRef = ref(database, `admins/${userId}`);
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

            // Also add to staff collection if not already there
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
            } else {
                // Update existing staff entry with admin role
                await update(staffRef, {
                    role: 'admin',
                    updatedAt: new Date().toISOString()
                });
            }

            console.log('Default admin account set up successfully');
            return true;
        } catch (error) {
            console.error('Error setting up default admin:', error);
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