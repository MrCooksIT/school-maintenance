// src/components/admin/Workload.jsx
// src/components/admin/Workload.jsx
import React, { useState, useEffect } from 'react';
import { ref, onValue } from 'firebase/database';
import { database } from '@/config/firebase';
import { cn } from "@/lib/utils";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import {
    AlertCircle,
    Clock,
    CheckCircle,
    AlertTriangle,
    User,
    Loader2
} from 'lucide-react';
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip";

const Workload = () => {
    const [tickets, setTickets] = useState([]);
    const [staff, setStaff] = useState([]);
    const [loading, setLoading] = useState(true);
    const [hideEmpty, setHideEmpty] = useState(false);
    const [sortBy, setSortBy] = useState('name');

    // Move these functions OUTSIDE of useEffect
    const calculateWorkloadScore = (tickets) => {
        return tickets.reduce((score, ticket) => {
            let value = 1;
            if (ticket.priority === 'high') value += 2;
            if (ticket.priority === 'medium') value += 1;
            if (ticket.dueDate) {
                const dueDate = new Date(ticket.dueDate);
                const today = new Date();
                const diffDays = Math.ceil((dueDate - today) / (1000 * 60 * 60 * 24));
                if (diffDays <= 1) value += 3;
                else if (diffDays <= 3) value += 2;
                else if (diffDays <= 7) value += 1;
            }
            return score + value;
        }, 0);
    };

    const calculateWorkload = (staffMember) => {
        const staffTickets = tickets.filter(ticket => ticket.assignedTo === staffMember.id);
        const activeTickets = staffTickets.filter(t => t.status !== 'completed' && t.status !== 'paused');
        const pausedTickets = staffTickets.filter(t => t.status === 'paused');
        const completedTickets = staffTickets.filter(t => t.status === 'completed');
        const highPriorityTickets = activeTickets.filter(t => t.priority === 'high');
        const dueSoonTickets = activeTickets.filter(t => {
            if (!t.dueDate) return false;
            const dueDate = new Date(t.dueDate);
            const today = new Date();
            const diffDays = Math.ceil((dueDate - today) / (1000 * 60 * 60 * 24));
            return diffDays <= 3;
        });

        return {
            total: staffTickets.length,
            active: activeTickets.length,
            paused: pausedTickets.length,
            completed: completedTickets.length,
            highPriority: highPriorityTickets.length,
            dueSoon: dueSoonTickets.length,
            tickets: [...activeTickets, ...pausedTickets], // Include paused tickets in the display
            workloadScore: calculateWorkloadScore(activeTickets) // But don't count them in workload score
        };
    };

    useEffect(() => {
        const fetchData = async () => {
            const ticketsRef = ref(database, 'tickets');
            const staffRef = ref(database, 'staff');

            const unsubscribeTickets = onValue(ticketsRef, (snapshot) => {
                if (snapshot.exists()) {
                    const ticketsData = Object.entries(snapshot.val()).map(([id, data]) => ({
                        id,
                        ...data,
                    }));
                    setTickets(ticketsData);
                }
            });

            const unsubscribeStaff = onValue(staffRef, (snapshot) => {
                if (snapshot.exists()) {
                    const staffData = Object.entries(snapshot.val()).map(([id, data]) => ({
                        id,
                        ...data,
                    }));
                    setStaff(staffData);
                }
            });

            setLoading(false);

            return () => {
                unsubscribeTickets();
                unsubscribeStaff();
            };
        };

        fetchData();
    }, []);
    const sortedAndFilteredStaff = staff
        .filter(member => !hideEmpty || calculateWorkload(member).active > 0)
        .sort((a, b) => {
            const workloadA = calculateWorkload(a);
            const workloadB = calculateWorkload(b);

            switch (sortBy) {
                case 'workload':
                    return workloadB.workloadScore - workloadA.workloadScore;
                case 'active':
                    return workloadB.active - workloadA.active;
                case 'priority':
                    return workloadB.highPriority - workloadA.highPriority;
                default:
                    return a.name.localeCompare(b.name);
            }
        });

    const getWorkloadStatus = (score) => {
        if (score <= 5) return { label: 'Light', color: 'bg-green-100 text-green-800' };
        if (score <= 10) return { label: 'Moderate', color: 'bg-yellow-100 text-yellow-800' };
        return { label: 'Heavy', color: 'bg-red-100 text-red-800' };
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-full">
                <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
            </div>
        );
    }

    return (
        <div className="p-6 space-y-6">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-bold">Staff Workload Distribution</h1>
                <div className="flex gap-4">
                    <Select value={sortBy} onValueChange={setSortBy}>
                        <SelectTrigger className="w-[180px]">
                            <SelectValue placeholder="Sort by..." />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="name">Name</SelectItem>
                            <SelectItem value="workload">Workload</SelectItem>
                            <SelectItem value="active">Active Tickets</SelectItem>
                            <SelectItem value="priority">High Priority</SelectItem>
                        </SelectContent>
                    </Select>
                    <Button
                        variant="outline"
                        onClick={() => setHideEmpty(!hideEmpty)}
                        className={cn(
                            "transition-colors",
                            hideEmpty && "bg-blue-100 border-blue-200 text-blue-900"
                        )}
                    >
                        {hideEmpty ? "Show All Staff" : "Hide Inactive Staff"}
                    </Button>
                </div>
            </div>

            <div className="grid gap-6 grid-cols-1 lg:grid-cols-2">
                {sortedAndFilteredStaff.map((member) => {
                    const workload = calculateWorkload(member);
                    const workloadStatus = getWorkloadStatus(workload.workloadScore);

                    return (
                        <Card key={member.id}>
                            <CardHeader>
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <User className="h-5 w-5 text-gray-500" />
                                        <div>
                                            <CardTitle>{member.name}</CardTitle>
                                            <CardDescription>{member.department}</CardDescription>
                                        </div>
                                    </div>
                                    <Badge className={workloadStatus.color}>
                                        {workloadStatus.label} Workload
                                    </Badge>
                                </div>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-4">
                                    {/* Stats */}
                                    <div className="grid grid-cols-4 gap-4">
                                        <TooltipProvider>
                                            <Tooltip>
                                                <TooltipTrigger>
                                                    <div className="flex flex-col items-center p-2 bg-gray-50 rounded-lg">
                                                        <Clock className="h-4 w-4 text-blue-500 mb-1" />
                                                        <span className="text-lg font-semibold">{workload.active}</span>
                                                        <span className="text-xs text-gray-500">Active</span>
                                                    </div>
                                                </TooltipTrigger>
                                                <TooltipContent>
                                                    Active tickets
                                                </TooltipContent>
                                            </Tooltip>
                                        </TooltipProvider>

                                        <TooltipProvider>
                                            <Tooltip>
                                                <TooltipTrigger>
                                                    <div className="flex flex-col items-center p-2 bg-gray-50 rounded-lg">
                                                        <AlertCircle className="h-4 w-4 text-red-500 mb-1" />
                                                        <span className="text-lg font-semibold">{workload.highPriority}</span>
                                                        <span className="text-xs text-gray-500">High Priority</span>
                                                    </div>
                                                </TooltipTrigger>
                                                <TooltipContent>
                                                    High priority tickets
                                                </TooltipContent>
                                            </Tooltip>
                                        </TooltipProvider>

                                        <TooltipProvider>
                                            <Tooltip>
                                                <TooltipTrigger>
                                                    <div className="flex flex-col items-center p-2 bg-gray-50 rounded-lg">
                                                        <AlertTriangle className="h-4 w-4 text-yellow-500 mb-1" />
                                                        <span className="text-lg font-semibold">{workload.dueSoon}</span>
                                                        <span className="text-xs text-gray-500">Due Soon</span>
                                                    </div>
                                                </TooltipTrigger>
                                                <TooltipContent>
                                                    Tickets due within 3 days
                                                </TooltipContent>
                                            </Tooltip>
                                        </TooltipProvider>

                                        <TooltipProvider>
                                            <Tooltip>
                                                <TooltipTrigger>
                                                    <div className="flex flex-col items-center p-2 bg-gray-50 rounded-lg">
                                                        <CheckCircle className="h-4 w-4 text-green-500 mb-1" />
                                                        <span className="text-lg font-semibold">{workload.completed}</span>
                                                        <span className="text-xs text-gray-500">Completed</span>
                                                    </div>
                                                </TooltipTrigger>
                                                <TooltipContent>
                                                    Completed tickets
                                                </TooltipContent>
                                            </Tooltip>
                                        </TooltipProvider>
                                    </div>

                                    {/* Workload Bar */}
                                    <div className="space-y-2">
                                        <div className="flex justify-between text-sm">
                                            <span>Workload</span>
                                            <span>{Math.min(100, (workload.workloadScore / 15) * 100)}%</span>
                                        </div>
                                        <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                                            <div
                                                className="h-full rounded-full transition-all"
                                                style={{
                                                    width: `${Math.min(100, (workload.workloadScore / 15) * 100)}%`,
                                                    backgroundColor: workload.workloadScore > 10 ? '#ef4444' :
                                                        workload.workloadScore > 5 ? '#f59e0b' : '#22c55e'
                                                }}
                                            />
                                        </div>
                                    </div>

                                    {/* Active Tickets */}
                                    <div className="space-y-2">
                                        <h3 className="text-sm font-medium">Active Tickets</h3>
                                        <div className="space-y-1">
                                            {workload.tickets.map(ticket => (
                                                <div
                                                    key={ticket.id}
                                                    className="text-sm p-2 bg-gray-50 rounded-lg flex justify-between items-center"
                                                >
                                                    <span className="truncate">{ticket.subject}</span>
                                                    <Badge
                                                        className={
                                                            ticket.priority === 'high' ? 'bg-red-100 text-red-800' :
                                                                ticket.priority === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                                                                    'bg-green-100 text-green-800'
                                                        }
                                                    >
                                                        {ticket.priority}
                                                    </Badge>
                                                </div>
                                            ))}
                                            {workload.tickets.length === 0 && (
                                                <div className="text-sm text-gray-500 text-center py-2">
                                                    No active tickets
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    );
                })}
            </div>
        </div>
    );
};

export default Workload;