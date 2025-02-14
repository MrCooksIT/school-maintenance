import React, { useState } from 'react';
import { ref, update } from 'firebase/database';
import { database } from '@/config/firebase';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog';
import { Button } from '../ui/button';
import { Select } from '../ui/select'
import {
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue
} from '../ui/select';

// Constants for the form
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

const TicketActionModal = ({ ticket, isOpen, onClose }) => {
    const [assignedTo, setAssignedTo] = useState(ticket?.assignedTo || '');
    const [status, setStatus] = useState(ticket?.status || 'new');
    const handleUpdate = async () => {
        try {
            const ticketRef = ref(database, `tickets/${ticket.id}`);
            await update(ticketRef, {
                assignedTo,
                status,
                lastUpdated: new Date().toISOString(),
            });
            onClose();
        } catch (error) {
            console.error('Error updating ticket:', error);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Update Ticket {ticket?.ticketId}</DialogTitle>
                </DialogHeader>

                <div className="grid gap-4 py-4">
                    <div className="grid gap-2">
                        <label className="text-sm font-medium">Assign To:</label>
                        <Select.Root value={assignedTo} onValueChange={setAssignedTo}>
                            <Select.Trigger>
                                <Select.Value placeholder="Select staff member" />
                            </Select.Trigger>
                            <Select.Content>
                                {STAFF_MEMBERS.map((staff) => (
                                    <Select.Item key={staff.id} value={staff.id}>
                                        {staff.name} - {staff.department}
                                    </Select.Item>
                                ))}
                            </Select.Content>
                        </Select.Root>
                    </div>

                    <div className="grid gap-2">
                        <label className="text-sm font-medium">Status:</label>
                        <Select.Root value={status} onValueChange={setStatus}>
                            <Select.Trigger>
                                <Select.Value placeholder="Select status" />
                            </Select.Trigger>
                            <Select.Content>
                                {TICKET_STATUSES.map((status) => (
                                    <Select.Item key={status.value} value={status.value}>
                                        {status.label}
                                    </Select.Item>
                                ))}
                            </Select.Content>
                        </Select.Root>
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