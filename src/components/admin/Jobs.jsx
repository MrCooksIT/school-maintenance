// src/components/admin/Jobs.jsx
import React, { useState, useEffect } from 'react';
import { ref, onValue } from 'firebase/database';
import { database } from '@/config/firebase';
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/Avatar";
import {
    User,
    Clock,
    AlertCircle,
    CheckCircle,
    AlertTriangle
} from 'lucide-react';

const Jobs = () => {
    const [tickets, setTickets] = useState([]);
    const [staff, setStaff] = useState([]);

    useEffect(() => {
        const ticketsRef = ref(database, 'tickets');
        const unsubscribe = onValue(ticketsRef, (snapshot) => {
            if (snapshot.exists()) {
                const ticketsData = Object.entries(snapshot.val()).map(([id, data]) => ({
                    id,
                    ...data,
                }));
                setTickets(ticketsData);
            }
        });

        return () => unsubscribe();
    }, []);

    useEffect(() => {
        const staffRef = ref(database, 'staff');
        const unsubscribe = onValue(staffRef, (snapshot) => {
            if (snapshot.exists()) {
                const staffData = Object.entries(snapshot.val()).map(([id, data]) => ({
                    id,
                    ...data,
                }));
                setStaff(staffData);
            }
        });

        return () => unsubscribe();
    }, []);

    const getStaffWorkload = (staffId) => {
        const staffTickets = tickets.filter(ticket => ticket.assignedTo === staffId);
        return {
            total: staffTickets.length,
            active: staffTickets.filter(t => t.status !== 'completed').length,
            highPriority: staffTickets.filter(t => t.priority === 'high').length,
            completed: staffTickets.filter(t => t.status === 'completed').length,
            tickets: staffTickets
        };
    };

    const getPriorityBadge = (priority) => {
        const styles = {
            high: "bg-red-100 text-red-800 border-red-200",
            medium: "bg-yellow-100 text-yellow-800 border-yellow-200",
            low: "bg-green-100 text-green-800 border-green-200"
        };
        return (
            <Badge className={styles[priority] || styles.medium}>
                {priority}
            </Badge>
        );
    };

    const getStatusBadge = (status) => {
        const styles = {
            new: "bg-blue-100 text-blue-800 border-blue-200",
            "in-progress": "bg-yellow-100 text-yellow-800 border-yellow-200",
            completed: "bg-green-100 text-green-800 border-green-200"
        };
        return (
            <Badge className={styles[status] || styles.new}>
                {status}
            </Badge>
        );
    };

    return (
        <div className="space-y-6">
            {staff.map((member) => {
                const workload = getStaffWorkload(member.id);

                return (
                    <Card key={member.id}>
                        <CardHeader>
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-4">
                                    <Avatar>
                                        <AvatarFallback>
                                            {member.name.split(' ').map(n => n[0]).join('')}
                                        </AvatarFallback>
                                    </Avatar>
                                    <div>
                                        <CardTitle>{member.name}</CardTitle>
                                        <CardDescription>{member.department}</CardDescription>
                                    </div>
                                </div>
                                <div className="flex gap-4">
                                    <div className="flex items-center gap-2">
                                        <Clock className="h-4 w-4 text-blue-500" />
                                        <span>{workload.active} active</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <AlertCircle className="h-4 w-4 text-red-500" />
                                        <span>{workload.highPriority} high priority</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <CheckCircle className="h-4 w-4 text-green-500" />
                                        <span>{workload.completed} completed</span>
                                    </div>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-4">
                                {workload.tickets
                                    .filter(ticket => ticket.status !== 'completed')
                                    .map(ticket => (
                                        <div
                                            key={ticket.id}
                                            className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50"
                                        >
                                            <div className="space-y-1">
                                                <div className="flex items-center gap-2">
                                                    <span className="font-medium">{ticket.subject}</span>
                                                    {getPriorityBadge(ticket.priority)}
                                                    {getStatusBadge(ticket.status)}
                                                </div>
                                                <p className="text-sm text-gray-500">{ticket.description}</p>
                                            </div>
                                            <div className="flex items-center gap-4">
                                                {ticket.dueDate && (
                                                    <div className="flex items-center gap-2 text-sm">
                                                        <AlertTriangle className="h-4 w-4 text-yellow-500" />
                                                        Due {new Date(ticket.dueDate).toLocaleDateString('en-ZA')}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                {workload.tickets.filter(ticket => ticket.status !== 'completed').length === 0 && (
                                    <div className="text-center py-6 text-gray-500">
                                        No active tickets
                                    </div>
                                )}
                            </div>
                        </CardContent>
                    </Card>
                );
            })}
        </div>
    );
};

export default Jobs;