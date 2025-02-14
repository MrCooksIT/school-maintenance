// src/components/tickets/TicketActionModal.jsx
import React, { useState } from 'react';
import { ref, update } from 'firebase/database';
import { database } from '@/config/firebase';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog';
import { Button } from '../ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';

const STAFF_MEMBERS = [
    { id: 'staff1', name: 'John Smith', department: 'Plumbing' },
    { id: 'staff2', name: 'Sarah Johnson', department: 'Electrical' },
    { id: 'staff3', name: 'Mike Brown', department: 'General Maintenance' },
    // Add your actual staff members here
];

const TICKET_STATUSES = [
    { value: 'new', label: 'New' },
    { value: 'in-progress', label: 'In Progress' },
    { value: 'completed', label: 'Completed' }
];

const TicketActionModal = ({ ticket, isOpen, onClose }) => {
    const [assignedTo, setAssignedTo] = useState(ticket.assignedTo || '');
    const [status, setStatus] = useState(ticket.status || 'new');

    const handleUpdate = async () => {
        try {
            const ticketRef = ref(database, `tickets/${ticket.id}`);
            await update(ticketRef, {
                assignedTo,
                status,
                lastUpdated: new Date().toISOString(),
                lastUpdatedBy: 'current-user-id' // Replace with actual user ID
            });
            onClose();
        } catch (error) {
            console.error('Error updating ticket:', error);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Update Ticket {ticket.ticketId}</DialogTitle>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                    <div className="grid gap-2">
                        <label className="text-sm font-medium">Assign To:</label>
                        <Select value={assignedTo} onValueChange={setAssignedTo}>
                            <SelectTrigger>
                                <SelectValue placeholder="Select staff member" />
                            </SelectTrigger>
                            <SelectContent>
                                {STAFF_MEMBERS.map((staff) => (
                                    <SelectItem key={staff.id} value={staff.id}>
                                        {staff.name} - {staff.department}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="grid gap-2">
                        <label className="text-sm font-medium">Status:</label>
                        <Select value={status} onValueChange={setStatus}>
                            <SelectTrigger>
                                <SelectValue placeholder="Select status" />
                            </SelectTrigger>
                            <SelectContent>
                                {TICKET_STATUSES.map((status) => (
                                    <SelectItem key={status.value} value={status.value}>
                                        {status.label}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                </div>
                <div className="flex justify-end gap-3">
                    <Button variant="outline" onClick={onClose}>Cancel</Button>
                    <Button onClick={handleUpdate}>Update Ticket</Button>
                </div>
            </DialogContent>
        </Dialog>
    );
};

export default TicketActionModal;