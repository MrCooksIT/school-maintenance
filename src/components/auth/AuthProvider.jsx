// src/components/auth/AuthProvider.jsx
import { createContext, useContext, useEffect, useState } from 'react';
import { auth, database } from '../../config/firebase';
import { ref, get } from 'firebase/database';
import {
    signInWithPopup,
    GoogleAuthProvider,
    signOut as firebaseSignOut
} from 'firebase/auth';

const AuthContext = createContext({});

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [userRole, setUserRole] = useState(null);

    // Function to fetch user role from the database
    const fetchUserRole = async (userId) => {
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

            // Default role
            return 'staff';
        } catch (error) {
            console.error("Error fetching user role:", error);
            return 'staff'; // Default to staff on error
        }
    };

    useEffect(() => {
        const unsubscribe = auth.onAuthStateChanged(async (user) => {
            setUser(user);

            if (user) {
                // Fetch user role when authenticated
                const role = await fetchUserRole(user.uid);
                setUserRole(role);
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
            const role = await fetchUserRole(result.user.uid);
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