// src/components/admin/AdminRoleManager.jsx
import React, { useState, useEffect } from 'react';
import { ref, get, set, update, remove } from 'firebase/database';
import { database } from '@/config/firebase';

const AdminRoleManager = () => {
    const [staffMembers, setStaffMembers] = useState([]);
    const [adminUsers, setAdminUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedStaff, setSelectedStaff] = useState('');
    const [selectedRole, setSelectedRole] = useState('supervisor');
    const [message, setMessage] = useState({ text: '', type: '' });

    useEffect(() => {
        // Fetch staff members
        const fetchStaff = async () => {
            try {
                const staffRef = ref(database, 'staff');
                const snapshot = await get(staffRef);

                if (snapshot.exists()) {
                    const staffData = Object.entries(snapshot.val()).map(([id, data]) => ({
                        id,
                        ...data,
                    }));
                    setStaffMembers(staffData);
                }
            } catch (error) {
                console.error('Error fetching staff:', error);
                setMessage({
                    text: 'Error loading staff members',
                    type: 'error'
                });
            }
        };

        // Fetch admin users
        const fetchAdmins = async () => {
            try {
                const adminsRef = ref(database, 'admins');
                const snapshot = await get(adminsRef);

                if (snapshot.exists()) {
                    const adminData = Object.entries(snapshot.val()).map(([id, data]) => ({
                        id,
                        ...data,
                    }));
                    setAdminUsers(adminData);
                }
            } catch (error) {
                console.error('Error fetching admins:', error);
            }
        };

        Promise.all([fetchStaff(), fetchAdmins()])
            .finally(() => setLoading(false));
    }, []);

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!selectedStaff) {
            setMessage({
                text: 'Please select a staff member',
                type: 'error'
            });
            return;
        }

        try {
            setLoading(true);

            // Find the selected staff member
            const staffMember = staffMembers.find(staff => staff.id === selectedStaff);

            if (!staffMember) {
                throw new Error('Staff member not found');
            }

            // Create admin entry
            const adminRef = ref(database, `admins/${selectedStaff}`);

            await set(adminRef, {
                email: staffMember.email || '',
                name: staffMember.name,
                role: selectedRole,
                permissions: {
                    canManageUsers: selectedRole === 'admin',
                    canManageCategories: true,
                    canManageLocations: true,
                    canViewAnalytics: true,
                    canViewWorkload: true
                },
                createdAt: new Date().toISOString()
            });

            // Update staff record with role
            const staffRef = ref(database, `staff/${selectedStaff}`);
            await update(staffRef, {
                role: selectedRole,
                updatedAt: new Date().toISOString()
            });

            setMessage({
                text: `${staffMember.name} has been assigned the ${selectedRole} role`,
                type: 'success'
            });

            // Refresh admin list
            const adminsRef = ref(database, 'admins');
            const snapshot = await get(adminsRef);

            if (snapshot.exists()) {
                const adminData = Object.entries(snapshot.val()).map(([id, data]) => ({
                    id,
                    ...data,
                }));
                setAdminUsers(adminData);
            }

            // Reset form
            setSelectedStaff('');

        } catch (error) {
            console.error('Error assigning admin role:', error);
            setMessage({
                text: `Error: ${error.message}`,
                type: 'error'
            });
        } finally {
            setLoading(false);
        }
    };

    const removeAdminRole = async (adminId) => {
        if (!window.confirm('Are you sure you want to remove admin privileges from this user?')) {
            return;
        }

        try {
            setLoading(true);

            // Remove from admins collection
            const adminRef = ref(database, `admins/${adminId}`);
            await remove(adminRef);

            // Update staff record
            const staffRef = ref(database, `staff/${adminId}`);
            await update(staffRef, {
                role: 'staff',
                updatedAt: new Date().toISOString()
            });

            // Refresh admin list
            setAdminUsers(adminUsers.filter(admin => admin.id !== adminId));

            setMessage({
                text: 'Admin privileges removed successfully',
                type: 'success'
            });

        } catch (error) {
            console.error('Error removing admin role:', error);
            setMessage({
                text: `Error: ${error.message}`,
                type: 'error'
            });
        } finally {
            setLoading(false);
        }
    };

    // Helper to check if staff is already an admin
    const isStaffAdmin = (staffId) => {
        return adminUsers.some(admin => admin.id === staffId);
    };

    if (loading && staffMembers.length === 0) {
        return (
            <div className="p-6">
                <div className="flex justify-center items-center h-64">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                </div>
            </div>
        );
    }

    return (
        <div className="p-6">
            <h2 className="text-2xl font-bold mb-6">Admin Role Management</h2>

            {/* Message display */}
            {message.text && (
                <div className={`mb-6 p-4 rounded-md ${message.type === 'error' ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
                    {message.text}
                </div>
            )}

            {/* Assign role form */}
            <div className="bg-white p-6 rounded-lg shadow-sm mb-8">
                <h3 className="text-lg font-semibold mb-4">Assign Admin Role</h3>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-gray-700 mb-2">Select Staff Member</label>
                        <select
                            value={selectedStaff}
                            onChange={(e) => setSelectedStaff(e.target.value)}
                            className="w-full p-2 border border-gray-300 rounded-md"
                            disabled={loading}
                        >
                            <option value="">-- Select Staff --</option>
                            {staffMembers
                                .filter(staff => !isStaffAdmin(staff.id))
                                .map(staff => (
                                    <option key={staff.id} value={staff.id}>
                                        {staff.name} ({staff.department || 'No Department'})
                                    </option>
                                ))
                            }
                        </select>
                    </div>

                    <div>
                        <label className="block text-gray-700 mb-2">Admin Role</label>
                        <select
                            value={selectedRole}
                            onChange={(e) => setSelectedRole(e.target.value)}
                            className="w-full p-2 border border-gray-300 rounded-md"
                            disabled={loading}
                        >
                            <option value="supervisor">Supervisor</option>
                            <option value="admin">Admin</option>
                        </select>
                        <p className="text-sm text-gray-500 mt-1">
                            Supervisors can view analytics and manage categories/locations.
                            Admins can also manage other users.
                        </p>
                    </div>

                    <button
                        type="submit"
                        className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
                        disabled={loading || !selectedStaff}
                    >
                        {loading ? 'Processing...' : 'Assign Role'}
                    </button>
                </form>
            </div>

            {/* Current admins list */}
            <div className="bg-white p-6 rounded-lg shadow-sm">
                <h3 className="text-lg font-semibold mb-4">Current Admin Users</h3>

                {adminUsers.length === 0 ? (
                    <p className="text-gray-500">No admin users found</p>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-gray-50 text-left">
                                <tr>
                                    <th className="px-4 py-2">Name</th>
                                    <th className="px-4 py-2">Email</th>
                                    <th className="px-4 py-2">Role</th>
                                    <th className="px-4 py-2">Added On</th>
                                    <th className="px-4 py-2">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {adminUsers.map(admin => (
                                    <tr key={admin.id} className="border-b">
                                        <td className="px-4 py-2">{admin.name}</td>
                                        <td className="px-4 py-2">{admin.email || 'No Email'}</td>
                                        <td className="px-4 py-2">
                                            <span className={`px-2 py-1 rounded-full text-xs ${admin.role === 'admin' ? 'bg-blue-100 text-blue-800' : 'bg-purple-100 text-purple-800'
                                                }`}>
                                                {admin.role}
                                            </span>
                                        </td>
                                        <td className="px-4 py-2">
                                            {admin.createdAt ? new Date(admin.createdAt).toLocaleDateString() : 'Unknown'}
                                        </td>
                                        <td className="px-4 py-2">
                                            <button
                                                onClick={() => removeAdminRole(admin.id)}
                                                className="text-red-600 hover:text-red-800"
                                                disabled={loading}
                                            >
                                                Remove
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
};

export default AdminRoleManager;