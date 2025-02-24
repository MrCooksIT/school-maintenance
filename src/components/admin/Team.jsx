// src/components/admin/Team.jsx
import React, { useState, useEffect } from 'react';
import { ref, update, remove, push, onValue } from 'firebase/database';
import { database } from '@/config/firebase';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Users, X } from 'lucide-react';
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription
} from "@/components/ui/dialog";

const Team = () => {
    const [currentStaff, setCurrentStaff] = useState([]);
    const [newStaff, setNewStaff] = useState({
        name: '',
        department: '',
        email: ''
    });
    const [editingStaff, setEditingStaff] = useState(null);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [updatedStaff, setUpdatedStaff] = useState({
        name: '',
        department: '',
        email: ''
    });

    useEffect(() => {
        const staffRef = ref(database, 'staff');
        const unsubscribe = onValue(staffRef, (snapshot) => {
            if (snapshot.exists()) {
                const staffData = Object.entries(snapshot.val()).map(([id, data]) => ({
                    id,
                    ...data,
                }));
                setCurrentStaff(staffData);
            } else {
                setCurrentStaff([]);
            }
        });

        return () => unsubscribe();
    }, []);

    const handleAddStaff = async () => {
        if (!newStaff.name || !newStaff.department) return;

        try {
            const staffRef = ref(database, 'staff');
            await push(staffRef, {
                ...newStaff,
                activeTickets: 0,
                createdAt: new Date().toISOString()
            });
            setNewStaff({ name: '', department: '', email: '' });
        } catch (error) {
            console.error('Error adding staff:', error);
        }
    };
    const handleEditStaff = async () => {
        if (!editingStaff) return;
        try {
            const staffRef = ref(database, `staff/${editingStaff.id}`);
            await update(staffRef, {
                ...updatedStaff,
                updatedAt: new Date().toISOString()
            });
            setEditingStaff(null);
            setIsEditModalOpen(false);
            setUpdatedStaff({ name: '', department: '', email: '' });
        } catch (error) {
            console.error('Error updating staff:', error);
        }
    };
    const handleRemoveStaff = async (staffId) => {
        if (!window.confirm('Are you sure you want to remove this staff member?')) return;

        try {
            await remove(ref(database, `staff/${staffId}`));
        } catch (error) {
            console.error('Error removing staff:', error);
        }
    };

    return (
        <div className="p-6">
            <div className="grid grid-cols-2 gap-6">
                <Card>
                    <CardHeader>
                        <CardTitle>Add Staff Member</CardTitle>
                        <CardDescription>
                            Add new maintenance staff to the system
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-2">
                            <Input
                                placeholder="Name"
                                value={newStaff.name}
                                onChange={(e) => setNewStaff(prev => ({ ...prev, name: e.target.value }))}
                            />
                            <Input
                                placeholder="Department"
                                value={newStaff.department}
                                onChange={(e) => setNewStaff(prev => ({ ...prev, department: e.target.value }))}
                            />
                            <Input
                                placeholder="Email"
                                type="email"
                                value={newStaff.email}
                                onChange={(e) => setNewStaff(prev => ({ ...prev, email: e.target.value }))}
                            />
                            <Button onClick={handleAddStaff} className="w-full">
                                Add Staff Member
                            </Button>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>Current Staff</CardTitle>
                        <CardDescription>
                            Manage existing staff members
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-2">
                            {currentStaff.map((staff) => (
                                <div
                                    key={staff.id}
                                    className="flex items-center justify-between p-2 border rounded-lg"
                                >
                                    <div>
                                        <p className="font-medium">{staff.name}</p>
                                        <p className="text-sm text-muted-foreground">{staff.department}</p>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => {
                                                setEditingStaff(staff);
                                                setUpdatedStaff({
                                                    name: staff.name,
                                                    department: staff.department,
                                                    email: staff.email
                                                });
                                                setIsEditModalOpen(true);
                                            }}
                                        >
                                            Edit
                                        </Button>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => handleRemoveStaff(staff.id)}
                                            className="text-red-600 hover:text-red-700"
                                        >
                                            <X className="h-4 w-4" />
                                        </Button>
                                    </div>

                                    {/* Edit Staff Modal */}
                                    <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
                                        <DialogContent>
                                            <DialogHeader>
                                                <DialogTitle>Edit Staff Member</DialogTitle>
                                            </DialogHeader>
                                            <div className="space-y-4">
                                                <Input
                                                    placeholder="Name"
                                                    value={updatedStaff.name}
                                                    onChange={(e) => setUpdatedStaff(prev => ({ ...prev, name: e.target.value }))}
                                                />
                                                <Input
                                                    placeholder="Department"
                                                    value={updatedStaff.department}
                                                    onChange={(e) => setUpdatedStaff(prev => ({ ...prev, department: e.target.value }))}
                                                />
                                                <Input
                                                    placeholder="Email"
                                                    type="email"
                                                    value={updatedStaff.email}
                                                    onChange={(e) => setUpdatedStaff(prev => ({ ...prev, email: e.target.value }))}
                                                />
                                                <div className="flex justify-end gap-2">
                                                    <Button variant="outline" onClick={() => setIsEditModalOpen(false)}>
                                                        Cancel
                                                    </Button>
                                                    <Button onClick={handleEditStaff}>
                                                        Save Changes
                                                    </Button>
                                                </div>
                                            </div>
                                        </DialogContent>
                                    </Dialog>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}

export default Team;