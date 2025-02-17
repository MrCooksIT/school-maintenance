// src/components/tickets/StaffAssignment.jsx
import React, { useState, useEffect } from 'react';
import { ref, update, onValue } from 'firebase/database';
import { database } from '@/config/firebase';
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle
} from '../ui/card';
import { Button } from '../ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue
} from '../ui/select';
import { Badge } from '../ui/badge';
import { User, UserPlus, AlertCircle } from 'lucide-react';

// You can customize this list based on your school's maintenance staff
const MAINTENANCE_STAFF = [
    {
        id: 'staff1',
        name: 'John Smith',
        role: 'General Maintenance',
        email: 'john.smith@school.edu',
        activeTickets: 3
    },
    {
        id: 'staff2',
        name: 'Sarah Johnson',
        role: 'Electrical',
        email: 'sarah.j@school.edu',
        activeTickets: 1
    },
    // Add more staff members
];

export function StaffAssignment({ ticket }) {
    const [loading, setLoading] = useState(false);
    const [selectedStaff, setSelectedStaff] = useState(ticket.assignedTo || null);
    const [staffWorkloads, setStaffWorkloads] = useState({});

    // Fetch current workloads
    useEffect(() => {
        const workloadsRef = ref(database, 'staffWorkloads');
        const unsubscribe = onValue(workloadsRef, (snapshot) => {
            if (snapshot.exists()) {
                setStaffWorkloads(snapshot.val());
            }
        });

        return () => unsubscribe();
    }, []);

    const handleAssignment = async (staffId) => {
        setLoading(true);
        try {
            const updates = {};
            // Update ticket assignment
            updates[`tickets/${ticket.id}/assignedTo`] = staffId;
            updates[`tickets/${ticket.id}/status`] = staffId ? 'in-progress' : 'new';
            updates[`tickets/${ticket.id}/lastUpdated`] = new Date().toISOString();

            // Update staff workload
            if (selectedStaff) {
                updates[`staffWorkloads/${selectedStaff}/activeTickets`] =
                    (staffWorkloads[selectedStaff]?.activeTickets || 0) - 1;
            }
            if (staffId) {
                updates[`staffWorkloads/${staffId}/activeTickets`] =
                    (staffWorkloads[staffId]?.activeTickets || 0) + 1;
            }

            await update(ref(database), updates);
            setSelectedStaff(staffId);
        } catch (error) {
            console.error('Error assigning staff:', error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <div className="space-y-1">
                    <h4 className="text-sm font-medium">Current Assignment</h4>
                    {selectedStaff ? (
                        <StaffMember
                            staff={MAINTENANCE_STAFF.find(s => s.id === selectedStaff)}
                            workload={staffWorkloads[selectedStaff]?.activeTickets || 0}
                        />
                    ) : (
                        <p className="text-sm text-muted-foreground">No one assigned</p>
                    )}
                </div>

                <Select
                    value={selectedStaff || ''}
                    onValueChange={handleAssignment}
                    disabled={loading}
                >
                    <SelectTrigger className="w-[200px]">
                        <SelectValue placeholder="Assign staff..." />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="">Unassign</SelectItem>
                        {MAINTENANCE_STAFF.map((staff) => (
                            <SelectItem key={staff.id} value={staff.id}>
                                <div className="flex items-center justify-between w-full">
                                    <span>{staff.name}</span>
                                    <Badge variant="secondary">
                                        {staffWorkloads[staff.id]?.activeTickets || 0} active
                                    </Badge>
                                </div>
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>

            <Card className="bg-muted">
                <CardHeader>
                    <CardTitle className="text-sm">Available Staff</CardTitle>
                </CardHeader>
                <CardContent className="grid gap-2">
                    {MAINTENANCE_STAFF.map((staff) => (
                        <StaffMember
                            key={staff.id}
                            staff={staff}
                            workload={staffWorkloads[staff.id]?.activeTickets || 0}
                            onAssign={() => handleAssignment(staff.id)}
                            isAssigned={selectedStaff === staff.id}
                        />
                    ))}
                </CardContent>
            </Card>
        </div>
    );
}

function StaffMember({ staff, workload, onAssign, isAssigned }) {
    const isOverloaded = workload > 5; // Customize this threshold

    return (
        <div className={`
      flex items-center justify-between p-2 rounded-lg
      ${isAssigned ? 'bg-primary/10' : 'hover:bg-accent'}
    `}>
            <div className="flex items-center gap-3">
                <Avatar>
                    <AvatarFallback>
                        {staff.name.split(' ').map(n => n[0]).join('')}
                    </AvatarFallback>
                </Avatar>
                <div>
                    <p className="font-medium">{staff.name}</p>
                    <p className="text-sm text-muted-foreground">{staff.role}</p>
                </div>
            </div>

            <div className="flex items-center gap-2">
                <Badge variant={isOverloaded ? "destructive" : "secondary"}>
                    {workload} tickets
                </Badge>
                {onAssign && (
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={onAssign}
                        disabled={isAssigned}
                    >
                        {isAssigned ? 'Assigned' : 'Assign'}
                    </Button>
                )}
            </div>
        </div>
    );
}