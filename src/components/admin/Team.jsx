// src/components/admin/Team.jsx
// UPDATED VERSION WITH PHONE NUMBER FIELD

import React, { useState, useEffect } from 'react';
import { ref, push, update, remove, onValue } from 'firebase/database';
import { database } from '@/config/firebase';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useToast } from '@/components/ui/use-toast';
import { X, Phone } from 'lucide-react';

const ConfirmationDialog = ({ open, onOpenChange, title, description, onConfirm, confirmLabel, variant = "default" }) => {
    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>{title}</DialogTitle>
                    <DialogDescription>{description}</DialogDescription>
                </DialogHeader>
                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)}>
                        Cancel
                    </Button>
                    <Button
                        onClick={() => {
                            onConfirm();
                            onOpenChange(false);
                        }}
                        className={
                            variant === "destructive"
                                ? "bg-red-600 hover:bg-red-700 text-white"
                                : ""
                        }
                    >
                        {confirmLabel}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};

const Team = () => {
    const [currentStaff, setCurrentStaff] = useState([]);
    const [newStaff, setNewStaff] = useState({
        name: '',
        department: '',
        email: '',
        phone: ''  // NEW FIELD
    });
    const [editingStaff, setEditingStaff] = useState(null);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [updatedStaff, setUpdatedStaff] = useState({
        name: '',
        department: '',
        email: '',
        phone: ''  // NEW FIELD
    });
    const [confirmDialog, setConfirmDialog] = useState({
        open: false,
        staffId: null,
        staffName: ''
    });

    const { toast } = useToast();

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

    // Phone number validation
    const validatePhoneNumber = (phone) => {
        if (!phone) return true; // Phone is optional

        // Remove spaces and dashes
        const cleaned = phone.replace(/[\s-]/g, '');

        // Check if it matches South African format (+27XXXXXXXXX)
        const phoneRegex = /^\+27[0-9]{9}$/;
        return phoneRegex.test(cleaned);
    };

    const formatPhoneNumber = (phone) => {
        if (!phone) return '';
        // Remove spaces and dashes
        return phone.replace(/[\s-]/g, '');
    };

    const handleAddStaff = async () => {
        if (!newStaff.name || !newStaff.department) {
            toast({
                title: "Validation Error",
                description: "Name and department are required",
                variant: "destructive"
            });
            return;
        }

        // Validate phone number if provided
        if (newStaff.phone && !validatePhoneNumber(newStaff.phone)) {
            toast({
                title: "Invalid Phone Number",
                description: "Phone number must be in format: +27XXXXXXXXX (e.g., +27821234567)",
                variant: "destructive"
            });
            return;
        }

        try {
            const staffRef = ref(database, 'staff');
            const staffData = {
                ...newStaff,
                phone: formatPhoneNumber(newStaff.phone),
                activeTickets: 0,
                createdAt: new Date().toISOString(),
                notificationPreferences: {
                    email: true,
                    whatsapp: !!newStaff.phone  // Enable WhatsApp if phone is provided
                }
            };

            await push(staffRef, staffData);
            setNewStaff({ name: '', department: '', email: '', phone: '' });

            toast({
                title: "Staff Added",
                description: `${newStaff.name} has been added successfully${newStaff.phone ? ' with WhatsApp notifications enabled' : ''}`,
                variant: "success"
            });
        } catch (error) {
            console.error('Error adding staff:', error);
            toast({
                title: "Error",
                description: "Failed to add staff member",
                variant: "destructive"
            });
        }
    };

    const handleEditStaff = async () => {
        if (!editingStaff) return;

        // Validate phone number if provided
        if (updatedStaff.phone && !validatePhoneNumber(updatedStaff.phone)) {
            toast({
                title: "Invalid Phone Number",
                description: "Phone number must be in format: +27XXXXXXXXX (e.g., +27821234567)",
                variant: "destructive"
            });
            return;
        }

        try {
            const staffRef = ref(database, `staff/${editingStaff.id}`);
            await update(staffRef, {
                ...updatedStaff,
                phone: formatPhoneNumber(updatedStaff.phone),
                updatedAt: new Date().toISOString(),
                'notificationPreferences/whatsapp': !!updatedStaff.phone
            });

            setEditingStaff(null);
            setIsEditModalOpen(false);
            setUpdatedStaff({ name: '', department: '', email: '', phone: '' });

            toast({
                title: "Staff Updated",
                description: `${updatedStaff.name} has been updated successfully`,
                variant: "success"
            });
        } catch (error) {
            console.error('Error updating staff:', error);
            toast({
                title: "Error",
                description: "Failed to update staff member",
                variant: "destructive"
            });
        }
    };

    const handleRemoveStaffConfirm = (staffId) => {
        const staffToRemove = currentStaff.find(staff => staff.id === staffId);
        setConfirmDialog({
            open: true,
            staffId,
            staffName: staffToRemove?.name || "this staff member"
        });
    };

    const handleRemoveStaff = async () => {
        const { staffId, staffName } = confirmDialog;
        if (!staffId) return;

        try {
            await remove(ref(database, `staff/${staffId}`));
            toast({
                title: "Staff Removed",
                description: `${staffName} has been removed successfully`,
                variant: "info"
            });
        } catch (error) {
            console.error('Error removing staff:', error);
            toast({
                title: "Error",
                description: "Failed to remove staff member",
                variant: "destructive"
            });
        }
    };

    const openEditModal = (staff) => {
        setEditingStaff(staff);
        setUpdatedStaff({
            name: staff.name,
            department: staff.department,
            email: staff.email || '',
            phone: staff.phone || ''  // NEW FIELD
        });
        setIsEditModalOpen(true);
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
                            {/* NEW PHONE NUMBER FIELD */}
                            <div className="space-y-1">
                                <Input
                                    placeholder="WhatsApp Number (e.g., +27821234567)"
                                    type="tel"
                                    value={newStaff.phone}
                                    onChange={(e) => setNewStaff(prev => ({ ...prev, phone: e.target.value }))}
                                    className="pl-10"
                                />
                                <p className="text-xs text-gray-500 flex items-center gap-1">
                                    <Phone className="h-3 w-3" />
                                    Format: +27 followed by 9 digits (no spaces). Optional but recommended for WhatsApp notifications.
                                </p>
                            </div>
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
                                        {/* Show phone number if available */}
                                        {staff.phone && (
                                            <p className="text-xs text-green-600 flex items-center gap-1 mt-1">
                                                <Phone className="h-3 w-3" />
                                                {staff.phone}
                                            </p>
                                        )}
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => openEditModal(staff)}
                                        >
                                            Edit
                                        </Button>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => handleRemoveStaffConfirm(staff.id)}
                                            className="text-red-600 hover:text-red-700"
                                        >
                                            <X className="h-4 w-4" />
                                        </Button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
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
                        {/* NEW PHONE NUMBER FIELD IN EDIT MODAL */}
                        <div className="space-y-1">
                            <Input
                                placeholder="WhatsApp Number (e.g., +27821234567)"
                                type="tel"
                                value={updatedStaff.phone}
                                onChange={(e) => setUpdatedStaff(prev => ({ ...prev, phone: e.target.value }))}
                            />
                            <p className="text-xs text-gray-500 flex items-center gap-1">
                                <Phone className="h-3 w-3" />
                                Format: +27XXXXXXXXX (no spaces)
                            </p>
                        </div>
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

            {/* Confirmation Dialog */}
            <ConfirmationDialog
                open={confirmDialog.open}
                onOpenChange={(open) => setConfirmDialog(prev => ({ ...prev, open }))}
                title="Remove Staff Member"
                description={`Are you sure you want to remove ${confirmDialog.staffName}? This action cannot be undone.`}
                onConfirm={handleRemoveStaff}
                confirmLabel="Remove"
                variant="destructive"
            />
        </div>
    );
}

export default Team;