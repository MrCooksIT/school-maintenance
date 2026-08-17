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
//List of public routes
const PUBLIC_ROUTES = [
    '/submit-ticket',
    '/login',
    '/admin/login'
];
// List of admin-only routes
const ADMIN_ROUTES = [
    '/admin/analytics',
    '/admin/workload',
    '/admin/locations',
    '/admin/categories',
    '/admin/team',
    '/admin/access',
    // Booking admin. /bookings and /bookings/mine stay open to all staff, and
    // /bookings/approvals is open because approvers are not necessarily admins.
    '/bookings/all',
    '/bookings/assets',
    '/bookings/approvers'
];

// List of full-admin-only routes
const FULL_ADMIN_ROUTES = [
    '/admin/roles'
];
const DEFAULT_ADMIN_EMAIL = 'acoetzee@maristsj.co.za';
const ALLOWED_EMAIL_DOMAIN = '@maristsj.co.za';

/**
 * Record this account under users/{uid} on sign-in.
 *
 * staff/ and admins/ are keyed by push id, so there is no way to look a person
 * up by their Firebase uid - which is what the security rules match on. This
 * gives the booking system a uid-keyed directory so approvers can be assigned
 * by name instead of by pasting raw uids. Best effort: never block sign-in.
 */
async function registerUserDirectoryEntry(authUser) {
    if (!authUser?.email?.toLowerCase().endsWith(ALLOWED_EMAIL_DOMAIN)) return;
    try {
        await update(ref(database, `users/${authUser.uid}`), {
            email: authUser.email,
            name: authUser.displayName || authUser.email,
            photoURL: authUser.photoURL || null,
            lastSeen: new Date().toISOString()
        });
    } catch (error) {
        console.error('Could not record user directory entry:', error);
    }
}

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [userRole, setUserRole] = useState(null);
    // Whether a record exists at admins/{uid} specifically. userRole can also come
    // from the staff node, but the security rules only ever check admins/{uid} -
    // so this is what the booking UI must gate on to avoid showing buttons that
    // the database will refuse.
    const [isDatabaseAdmin, setIsDatabaseAdmin] = useState(false);
    // Whether this person may see the maintenance portal at all. Ordinary
    // teachers sign in only to book rooms and vehicles, and must not see the
    // ticket system. Backed by maintenanceStaff/{uid}, which is uid-keyed
    // because staff/ is keyed by push id and rules can only match on auth.uid.
    const [isMaintenanceUser, setIsMaintenanceUser] = useState(false);
    const navigate = useNavigate();
    const location = useLocation();


    useEffect(() => {
        console.log("User role changed:", userRole);
    }, [userRole]);

    // Navigation guard effect
    useEffect(() => {
        // Skip during loading
        if (loading) return;


        if (PUBLIC_ROUTES.includes(location.pathname)) {
            return;
        }
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

        // Ordinary teachers only get the booking side of the app. Everything
        // under /admin and the ticket dashboard at / belongs to maintenance.
        if (user && !(isDatabaseAdmin || isMaintenanceUser)) {
            const isMaintenanceArea =
                location.pathname === '/' ||
                (location.pathname.startsWith('/admin') && !location.pathname.startsWith('/admin/login'));

            if (isMaintenanceArea) {
                navigate('/bookings', { replace: true });
                return;
            }
        }

        // Check admin route access. 'supervisor' used to count as admin here,
        // which let a limited estate staffer reshape locations, categories and
        // team. Admin now means admin.
        if (user && ADMIN_ROUTES.some(route => location.pathname.startsWith(route))) {
            if (userRole !== 'admin') {
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
    }, [user, loading, userRole, isDatabaseAdmin, isMaintenanceUser, location.pathname, navigate]);

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
            setIsDatabaseAdmin(snapshot.exists());
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

        // Maintenance portal access, tracked separately from booking roles.
        const maintenanceRef = ref(database, `maintenanceStaff/${user.uid}`);
        const unsubscribeMaintenance = onValue(maintenanceRef, (snapshot) => {
            setIsMaintenanceUser(snapshot.exists() && snapshot.val() !== false);
        }, (error) => {
            console.error("Error in maintenance access listener:", error);
            setIsMaintenanceUser(false);
        });

        return () => {
            console.log("Cleaning up role listeners");
            unsubscribeAdmin();
            unsubscribeMaintenance();
        };
    }, [user]);

    // Auth state change
    useEffect(() => {
        const unsubscribe = auth.onAuthStateChanged(async (authUser) => {
            console.log("Auth state changed:", authUser ? authUser.email : "logged out");
            setUser(authUser);

            if (authUser) {
                // Do not set role here, it will be set by the real-time listener
                registerUserDirectoryEntry(authUser);
            } else {
                setUserRole(null);
                setIsDatabaseAdmin(false);
                setIsMaintenanceUser(false);
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
        // Nudges the Google chooser towards school accounts. This is a hint only -
        // the security rules are what actually enforce the domain.
        provider.setCustomParameters({ hd: 'maristsj.co.za' });

        try {
            console.log("Starting Google sign in...");
            const result = await signInWithPopup(auth, provider);

            if (!result.user.email?.toLowerCase().endsWith(ALLOWED_EMAIL_DOMAIN)) {
                await firebaseSignOut(auth);
                throw new Error(`Please sign in with your school account (${ALLOWED_EMAIL_DOMAIN}).`);
            }

            console.log("Sign in successful for:", result.user.email);
            await registerUserDirectoryEntry(result.user);

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

    // Check if user has admin privileges. Limited estate staff get ticket access
    // through maintenanceStaff/{uid}, not through a role that shades into admin.
    const isAdmin = () => {
        return userRole === 'admin';
    };

    const value = {
        user,
        loading,
        signIn,
        signOut,
        userRole,
        isAdmin,
        isDatabaseAdmin,
        isMaintenanceUser,
        canSeeMaintenance: isDatabaseAdmin || isMaintenanceUser,
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