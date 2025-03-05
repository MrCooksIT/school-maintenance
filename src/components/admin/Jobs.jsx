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
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/Avatar";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    User,
    Clock,
    AlertCircle,
    CheckCircle,
    AlertTriangle,
    ArrowUpDown,
    Filter
} from 'lucide-react';
import { useToast } from "@/components/ui/use-toast";

const Jobs = () => {
    const [tickets, setTickets] = useState([]);
    const [staff, setStaff] = useState([]);
    const [sortBy, setSortBy] = useState('name');
    const [showEmpty, setShowEmpty] = useState(true);
    const { toast } = useToast();

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
            "paused": "bg-purple-100 text-purple-800 border-purple-200",
            completed: "bg-green-100 text-green-800 border-green-200",
            overdue: "bg-red-100 text-red-800 border-red-200"
        };
        return (
            <Badge className={styles[status] || styles.new}>
                {status === 'in-progress' ? 'IN PROGRESS' :
                    status === 'paused' ? 'PAUSED' :
                        status?.toUpperCase()}
            </Badge>
        );
    };

    // Sort staff members based on the selected sort option
    const sortedStaff = [...staff].sort((a, b) => {
        switch (sortBy) {
            case 'name':
                return a.name.localeCompare(b.name);
            case 'taskCount':
                return getStaffWorkload(b.id).active - getStaffWorkload(a.id).active;
            case 'department':
                return a.department.localeCompare(b.department);
            default:
                return 0;
        }
    });

    // Filter staff members if showEmpty is false
    const filteredStaff = showEmpty
        ? sortedStaff
        : sortedStaff.filter(member => getStaffWorkload(member.id).active > 0);

    return (
        <div className="space-y-6 p-6">
            <div className="flex justify-between items-center bg-white p-4 rounded-lg shadow-sm">
                <h2 className="text-xl font-bold">Staff Assignments</h2>
                <div className="flex gap-4">
                    <div className="flex items-center gap-2">
                        <span className="text-sm text-gray-500">Sort by:</span>
                        <Select value={sortBy} onValueChange={setSortBy}>
                            <SelectTrigger className="w-[180px]">
                                <SelectValue placeholder="Sort by..." />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="name">Name</SelectItem>
                                <SelectItem value="department">Department</SelectItem>
                                <SelectItem value="taskCount">Task Count</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    <Button
                        variant="outline"
                        onClick={() => setShowEmpty(!showEmpty)}
                        className={!showEmpty ? "bg-blue-50 border-blue-200" : ""}
                    >
                        <Filter className="h-4 w-4 mr-2" />
                        {showEmpty ? "Hide Empty" : "Show All"}
                    </Button>
                </div>
            </div>

            {filteredStaff.length === 0 ? (
                <div className="bg-white p-8 text-center rounded-lg shadow-sm">
                    <AlertCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium mb-2">No staff members found</h3>
                    <p className="text-gray-500">
                        {showEmpty ? "No staff members in the system." : "No staff members with active tickets."}
                    </p>
                </div>
            ) : (
                filteredStaff.map((member) => {
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
                })
            )}
        </div>
    );
};

export default Jobs;