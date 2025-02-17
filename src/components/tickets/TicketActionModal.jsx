// src/components/tickets/TicketActionModal.jsx
import React, { useState } from 'react';
import { ref, update } from 'firebase/database';
import { database } from '@/config/firebase';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription
} from '../ui/dialog';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Textarea } from '../ui/textarea';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "../ui/select";

const STAFF_MEMBERS = [
    { id: 'staff1', name: 'John Smith', department: 'Plumbing' },
    { id: 'staff2', name: 'Sarah Johnson', department: 'Electrical' },
    { id: 'staff3', name: 'Mike Brown', department: 'General Maintenance' },
];

const TICKET_STATUSES = [
    { value: 'new', label: 'New' },
    { value: 'in-progress', label: 'In Progress' },
    { value: 'completed', label: 'Completed' }
];

const PRIORITIES = [
    { value: 'low', label: 'Low' },
    { value: 'medium', label: 'Medium' },
    { value: 'high', label: 'High' }
];

const handleChange = (field, value) => {
    setFormData(prev => ({
        ...prev,
        [field]: value
    }));
};

const handleUpdate = async () => {
    try {
        const ticketRef = ref(database, `tickets/${ticket.id}`);
        await update(ticketRef, {
            ...formData,
            assignedTo: formData.assignedTo === 'unassigned' ? null : formData.assignedTo,
            lastUpdated: new Date().toISOString()
        });
        onClose();
    } catch (error) {
        console.error('Error updating ticket:', error);
    }
};

const handleDelete = async () => {
    if (window.confirm('Are you sure you want to delete this ticket?')) {
        try {
            const ticketRef = ref(database, `tickets/${ticket.id}`);
            // Instead of deleting, we mark it as deleted
            await update(ticketRef, {
                status: 'deleted',
                lastUpdated: new Date().toISOString()
            });
            onClose();
        } catch (error) {
            console.error('Error deleting ticket:', error);
        }
    }
};
const handleMarkComplete = async () => {
    try {
        const ticketRef = ref(database, `tickets/${ticket.id}`);
        await update(ticketRef, {
            status: 'completed',
            completedAt: new Date().toISOString(),
            lastUpdated: new Date().toISOString()
        });
        onClose();
    } catch (error) {
        console.error('Error marking ticket as complete:', error);
    }
};
const TicketActionModal = ({ ticket, isOpen, onClose }) => {
    const [formData, setFormData] = useState({
        status: ticket?.status || 'new',
        priority: ticket?.priority || 'medium',
        location: ticket?.location || '',
        category: ticket?.category || ''
    });

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Edit Ticket {ticket?.ticketId}</DialogTitle>
                </DialogHeader>

                <div className="grid gap-4 py-4">
                    <div className="grid gap-2">
                        <label className="text-sm font-medium">Location:</label>
                        <Select
                            defaultValue={formData.location}
                            onValueChange={(value) => setFormData(prev => ({ ...prev, location: value }))}
                        >
                            <SelectTrigger>
                                <SelectValue placeholder="Select location" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="building-a">Building A</SelectItem>
                                <SelectItem value="building-b">Building B</SelectItem>
                                <SelectItem value="field">Sports Field</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="grid gap-2">
                        <label className="text-sm font-medium">Category:</label>
                        <Select
                            defaultValue={formData.category}
                            onValueChange={(value) => setFormData(prev => ({ ...prev, category: value }))}
                        >
                            <SelectTrigger>
                                <SelectValue placeholder="Select category" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="electrical">Electrical</SelectItem>
                                <SelectItem value="plumbing">Plumbing</SelectItem>
                                <SelectItem value="furniture">Furniture</SelectItem>
                                <SelectItem value="it">IT Equipment</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </div>

                <div className="flex justify-end gap-2">
                    <Button variant="outline" onClick={onClose}>Cancel</Button>
                    <Button
                        variant="destructive"
                        onClick={() => handleDelete(ticket.id)}
                    >
                        Delete
                    </Button>
                    <Button onClick={() => handleUpdate(ticket.id, formData)}>Save</Button>
                </div>
            </DialogContent>
        </Dialog>
    );
};


export default TicketActionModal;