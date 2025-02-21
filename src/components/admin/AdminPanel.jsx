import React, { useState, useEffect } from 'react';
import { ref, update, remove, push, onValue } from 'firebase/database';
import { database } from '@/config/firebase';
import {
    ResponsiveContainer,
    BarChart,
    Bar,
    XAxis,
    YAxis,
    Tooltip,
    LineChart,
    Line,
    LabelList
} from 'recharts';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogTrigger,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    Settings,
    Users,
    Activity,
    Building,
    BarChart4,
    TrendingUp,
    TrendingDown,
    Minus,
    X
} from 'lucide-react';
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";

export function AdminPanel() {
    const [isOpen, setIsOpen] = useState(false);
    const [currentStaff, setCurrentStaff] = useState([]);
    const [tickets, setTickets] = useState([]);
    const [newStaff, setNewStaff] = useState({
        name: '',
        department: '',
        email: ''
    });
    const [locations, setLocations] = useState([]);
    const [editingStaff, setEditingStaff] = useState(null); // Store the staff being edited
    const [updatedStaff, setUpdatedStaff] = useState({
        name: '',
        department: '',
        email: ''
    });

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
                setCurrentStaff(staffData);
            } else {
                setCurrentStaff([]);
            }
        });

        return () => unsubscribe();
    }, []);

    useEffect(() => {
        const locationsRef = ref(database, 'locations');
        const unsubscribe = onValue(locationsRef, (snapshot) => {
            if (snapshot.exists()) {
                const locationData = Object.entries(snapshot.val()).map(([id, data]) => ({
                    id,
                    ...data,
                }));
                setLocations(locationData);
            } else {
                setLocations([]);
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
    const handleEditStaff = (staffId) => {
        const staffToEdit = currentStaff.find(staff => staff.id === staffId);
        if (!staffToEdit) return;
        setEditingStaff(staffToEdit);
        setUpdatedStaff({
            name: staffToEdit.name,
            department: staffToEdit.department,
            email: staffToEdit.email
        });
    };
    const handleSaveEdit = async () => {
        if (!editingStaff || !updatedStaff.name || !updatedStaff.department) return;

        try {
            const staffRef = ref(database, `staff/${editingStaff.id}`);
            await update(staffRef, {
                name: updatedStaff.name,
                department: updatedStaff.department,
                email: updatedStaff.email
            });
            setEditingStaff(null);
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
    const calculateAvgResolutionTime = (tickets) => {
        const completedTickets = tickets.filter(t => t.status === 'completed');
        if (completedTickets.length === 0) return 0;

        const totalTime = completedTickets.reduce((acc, ticket) => {
            const created = new Date(ticket.createdAt);
            const completed = new Date(ticket.lastUpdated);
            return acc + (completed - created) / (1000 * 60 * 60);
        }, 0);
        return Math.round(totalTime / completedTickets.length);
    };
    const MetricCard = ({ title, value, subValue, trend, trendValue }) => (
        <div className="p-4 bg-[#0a1e46] rounded-lg border border-gray-700">
            <h4 className="text-sm text-gray-300 mb-1">{title}</h4>
            <div className="flex items-end justify-between">
                <div>
                    <p className="text-2xl font-semibold text-white">{value}</p>
                    <p className="text-sm text-gray-400">{subValue}</p>
                </div>
                <div className={`flex items-center gap-1 text-sm ${trend === 'up' ? 'text-red-400' :
                    trend === 'down' ? 'text-green-400' :
                        'text-gray-400'
                    }`}>
                    {trend === 'up' ? <TrendingUp className="h-4 w-4" /> :
                        trend === 'down' ? <TrendingDown className="h-4 w-4" /> :
                            <Minus className="h-4 w-4" />}
                    {trendValue}
                </div>
            </div>
        </div>
    );

    const calculateAnalytics = () => {
        if (currentStaff.length === 0 || tickets.length === 0) {
            return {
                staffPerformance: [],
                monthlyTrends: [],
                topPerformer: { name: 'No data', avgTime: 0 },
                overallAvg: 0,
                openTickets: 0
            };
        }

        const staffPerformance = currentStaff.map(staff => {
            const staffTickets = tickets.filter(t => t.assignedTo === staff.id);
            const activeTickets = staffTickets.filter(t => t.status !== 'completed').length;


            const completedTickets = staffTickets.filter(t => t.status === 'completed');
            const totalTime = completedTickets.reduce((acc, ticket) => {
                const created = new Date(ticket.createdAt);
                const completed = new Date(ticket.lastUpdated);
                return acc + (completed - created) / (1000 * 60 * 60);
            }, 0);

            return {
                name: staff.name,
                avgTime: completedTickets.length ? Math.round(totalTime / completedTickets.length) : 0,
                totalTickets: staffTickets.length,
                activeTickets,
                completedTickets: completedTickets.length,
                highPriorityTickets: staffTickets.filter(t => t.priority === 'high').length
            };
        });


        const monthlyTrends = Array.from({ length: 6 }, (_, i) => {
            const date = new Date();
            date.setMonth(date.getMonth() - i);
            const month = date.toLocaleString('default', { month: 'short' });

            const monthTickets = tickets.filter(t => {
                const ticketDate = new Date(t.createdAt);
                return ticketDate.getMonth() === date.getMonth() &&
                    ticketDate.getFullYear() === date.getFullYear();
            });
            return {
                month,
                total: monthTickets.length,
                completed: monthTickets.filter(t => t.status === 'completed').length,
                avgResolutionTime: calculateAvgResolutionTime(monthTickets),
                highPriority: monthTickets.filter(t => t.priority === 'high').length
            };
        }).reverse();

        const openTickets = tickets.filter(t => t.status !== 'completed');
        const bestPerformer = staffPerformance.reduce((best, current) => {
            if (current.completedTickets === 0) return best;
            const bestScore = best.completedTickets / (best.avgTime || 1);
            const currentScore = current.completedTickets / (current.avgTime || 1);
            return currentScore > bestScore ? current : best;
        }, staffPerformance[0]);
        return {
            staffPerformance,
            monthlyTrends,
            topPerformer: bestPerformer,
            overallAvg: calculateAvgResolutionTime(tickets),
            openTickets: openTickets.length,
            highPriorityOpen: openTickets.filter(t => t.priority === 'high').length,
            totalTickets: tickets.length,
            completionRate: Math.round((tickets.filter(t => t.status === 'completed').length / tickets.length) * 100)
        };
    };

    const {
        staffPerformance,
        monthlyTrends,
        topPerformer,
        overallAvg,
        openTickets
    } = calculateAnalytics();

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
                <Button variant="outline" size="icon">
                    <Settings className="h-4 w-4" />
                </Button>
            </DialogTrigger>
            <DialogContent className="w-[95vw] h-[95vh] max-w-[1800px] p-0 bg-[#0a1e46] text-white">
                <div className="shrink-0 p-6 border-b border-gray-700">
                    <DialogTitle className="text-xl font-bold text-white">System Management</DialogTitle>
                    <DialogDescription className="text-gray-300">
                        Manage staff, view analytics, and configure system settings
                    </DialogDescription>
                </div>

                <div className="flex-1 min-h-0 flex flex-col">
                    <Tabs defaultValue="analytics" className="flex-1 flex flex-col min-h-0">
                        <div className="shrink-0 px-6 pt-6">
                            <TabsList className="grid w-full grid-cols-4 bg-[#0f2a5e]">
                                <TabsTrigger value="analytics" className="text-gray-300 data-[state=active]:bg-[#0a1e46] data-[state=active]:text-white">
                                    <BarChart4 className="h-4 w-4 mr-2" />
                                    Analytics
                                </TabsTrigger>
                                <TabsTrigger value="staff" className="text-gray-300 data-[state=active]:bg-[#0a1e46] data-[state=active]:text-white">
                                    <Users className="h-4 w-4 mr-2" />
                                    Staff
                                </TabsTrigger>
                                <TabsTrigger value="workload" className="text-gray-300 data-[state=active]:bg-[#0a1e46] data-[state=active]:text-white">
                                    <Activity className="h-4 w-4 mr-2" />
                                    Workload
                                </TabsTrigger>
                                <TabsTrigger value="locations" className="text-gray-300 data-[state=active]:bg-[#0a1e46] data-[state=active]:text-white">
                                    <Building className="h-4 w-4 mr-2" />
                                    Locations
                                </TabsTrigger>
                            </TabsList>
                        </div>

                        <div className="flex-1 overflow-y-auto px-6 pb-6">
                            <TabsContent value="analytics" className="mt-6 space-y-8 pt-2">
                                <div className="space-y-8">
                                    <div className="grid grid-cols-3 gap-6">
                                        <MetricCard
                                            title="Best Performer"
                                            value={topPerformer?.name || 'No data'}
                                            subValue={`${topPerformer?.avgTime || 0}h avg`}
                                            trend="down"
                                            trendValue="12%"
                                        />
                                        <MetricCard
                                            title="Avg Resolution Time"
                                            value={`${overallAvg || 0}h`}
                                            subValue="All tickets"
                                            trend="up"
                                            trendValue="5%"
                                        />
                                        <MetricCard
                                            title="Open Tickets"
                                            value={openTickets || 0}
                                            subValue="Pending resolution"
                                            trend="neutral"
                                            trendValue="0%"
                                        />
                                    </div>
                                </div>



                                <div className="grid grid-cols-2 gap-6 mt-8">
                                    <Card className="bg-[#0f2a5e] border-gray-700">
                                        <CardHeader>
                                            <CardTitle className="text-white">Average Resolution Time by Staff</CardTitle>
                                        </CardHeader>
                                        <CardContent>
                                            <div className="h-[400px]">
                                                <ResponsiveContainer width="100%" height="100%">
                                                    <BarChart data={staffPerformance}>
                                                        <XAxis dataKey="name" stroke="#94a3b8" />
                                                        <YAxis
                                                            stroke="#94a3b8"
                                                            tickFormatter={(value) => `${value}h`}
                                                        />
                                                        <Tooltip
                                                            contentStyle={{ backgroundColor: '#0a1e46', border: 'none' }}
                                                            labelStyle={{ color: 'white' }}
                                                        />
                                                        <Bar dataKey="avgTime" fill="#3b82f6">
                                                            <LabelList dataKey="avgTime" position="top" fill="#94a3b8" />
                                                        </Bar>
                                                    </BarChart>
                                                </ResponsiveContainer>
                                            </div>
                                        </CardContent>
                                    </Card>

                                    <Card className="bg-[#0f2a5e] border-gray-700">
                                        <CardHeader>
                                            <CardTitle className="text-white">Monthly Resolution Trends</CardTitle>
                                        </CardHeader>
                                        <CardContent>
                                            <div className="h-[400px]">
                                                <ResponsiveContainer width="100%" height="100%">
                                                    <LineChart data={monthlyTrends}>
                                                        <XAxis dataKey="month" stroke="#94a3b8" />
                                                        <YAxis stroke="#94a3b8" />
                                                        <Tooltip
                                                            contentStyle={{ backgroundColor: '#0a1e46', border: 'none' }}
                                                            labelStyle={{ color: 'white' }}
                                                        />
                                                        <Line
                                                            type="monotone"
                                                            dataKey="avgResolutionTime"
                                                            stroke="#3b82f6"
                                                            strokeWidth={2}
                                                        />
                                                    </LineChart>
                                                </ResponsiveContainer>
                                            </div>
                                        </CardContent>
                                    </Card>
                                </div>
                            </TabsContent>
                            <TabsContent value="staff" className="mt-6">
                                <div className="grid grid-cols-2 gap-6">
                                    <Card className="bg-[#0f2a5e] border-gray-700">
                                        <CardHeader>
                                            <CardTitle className="text-white">Add Staff Member</CardTitle>
                                            <CardDescription className="text-gray-300">
                                                Add new maintenance staff to the system
                                            </CardDescription>
                                        </CardHeader>
                                        <CardContent className="space-y-4">
                                            <div className="space-y-2">
                                                <Input
                                                    placeholder="Name"
                                                    value={newStaff.name}
                                                    onChange={(e) => setNewStaff(prev => ({ ...prev, name: e.target.value }))}
                                                    className="bg-[#0a1e46] border-gray-700 text-white placeholder:text-gray-400"
                                                />
                                                <Input
                                                    placeholder="Department"
                                                    value={newStaff.department}
                                                    onChange={(e) => setNewStaff(prev => ({ ...prev, department: e.target.value }))}
                                                    className="bg-[#0a1e46] border-gray-700 text-white placeholder:text-gray-400"
                                                />
                                                <Input
                                                    placeholder="Email"
                                                    type="email"
                                                    value={newStaff.email}
                                                    onChange={(e) => setNewStaff(prev => ({ ...prev, email: e.target.value }))}
                                                    className="bg-[#0a1e46] border-gray-700 text-white placeholder:text-gray-400"
                                                />
                                                <Button onClick={handleAddStaff} className="w-full bg-blue-600 hover:bg-blue-700">
                                                    Add Staff Member
                                                </Button>
                                            </div>
                                        </CardContent>
                                    </Card>

                                    <Card className="bg-[#0f2a5e] border-gray-700">
                                        <CardHeader>
                                            <CardTitle className="text-white">Current Staff</CardTitle>
                                            <CardDescription className="text-gray-300">
                                                Manage existing staff members
                                            </CardDescription>
                                        </CardHeader>
                                        <CardContent>
                                            <div className="space-y-2">
                                                {currentStaff.map((staff) => (
                                                    <div
                                                        key={staff.id}
                                                        className="flex items-center justify-between p-2 border border-gray-700 rounded-lg bg-[#0a1e46]"
                                                    >
                                                        <div>
                                                            <p className="font-medium text-white">{staff.name}</p>
                                                            <p className="text-sm text-gray-300">{staff.department}</p>
                                                        </div>
                                                        <div className="flex items-center gap-2">
                                                            <span className="text-sm text-gray-300">
                                                                {staff.activeTickets || 0} active tickets
                                                            </span>
                                                            <Button
                                                                variant="ghost"
                                                                size="sm"
                                                                onClick={() => handleRemoveStaff(staff.id)}
                                                                className="text-red-400 hover:text-red-300 hover:bg-red-900/20"
                                                            >
                                                                Remove
                                                            </Button>
                                                            <Button
                                                                variant="ghost"
                                                                size="sm"
                                                                onClick={() => handleEditStaff(staff.id)}
                                                                className="text-red-400 hover:text-red-300 hover:bg-red-900/20"
                                                            >
                                                                Edit
                                                            </Button>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>

                                        </CardContent>
                                    </Card>
                                </div>
                            </TabsContent>

                            <TabsContent value="workload" className="mt-0">
                                <Card className="bg-[#0f2a5e] border-gray-700">
                                    <CardHeader>
                                        <CardTitle className="text-white">Staff Workload</CardTitle>
                                        <CardDescription className="text-gray-300">
                                            Current ticket distribution
                                        </CardDescription>
                                    </CardHeader>
                                    <CardContent>
                                        <div className="space-y-6">
                                            {currentStaff.map((staff) => {
                                                const staffStats = staffPerformance.find(s => s.name === staff.name) || {
                                                    activeTickets: 0,
                                                    highPriorityTickets: 0,
                                                    avgTime: 0
                                                };

                                                return (
                                                    <div key={staff.id} className="space-y-2">
                                                        <div className="flex items-center justify-between">
                                                            <div>
                                                                <span className="text-sm font-medium text-white">{staff.name}</span>
                                                                <span className="text-sm text-gray-300 ml-2">
                                                                    ({staffStats.avgTime}h avg resolution)
                                                                </span>
                                                            </div>
                                                            <div className="flex gap-2">
                                                                <span className="text-sm text-gray-300">
                                                                    {staffStats.activeTickets} active
                                                                </span>
                                                                {staffStats.highPriorityTickets > 0 && (
                                                                    <span className="text-sm text-red-400">
                                                                        ({staffStats.highPriorityTickets} high priority)
                                                                    </span>
                                                                )}
                                                            </div>
                                                        </div>
                                                        <div className="space-y-1">
                                                            <div className="h-2 bg-[#0a1e46] rounded-full overflow-hidden">
                                                                <div
                                                                    className="h-full rounded-full transition-all"
                                                                    style={{
                                                                        width: `${Math.min((staffStats.activeTickets / 5) * 100, 100)}%`,
                                                                        backgroundColor: staffStats.activeTickets > 4 ? '#ef4444' : '#3b82f6'
                                                                    }}
                                                                />
                                                            </div>
                                                            {/* High Priority Bar */}
                                                            {staffStats.highPriorityTickets > 0 && (
                                                                <div className="h-1 bg-[#0a1e46] rounded-full overflow-hidden">
                                                                    <div
                                                                        className="h-full rounded-full transition-all bg-red-400"
                                                                        style={{
                                                                            width: `${(staffStats.highPriorityTickets / staffStats.activeTickets) * 100}%`,
                                                                        }}
                                                                    />
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </CardContent>
                                </Card>
                            </TabsContent>

                            <TabsContent value="locations" className="mt-0">
                                <Card className="bg-[#0f2a5e] border-gray-700">
                                    <CardHeader>
                                        <CardTitle className="text-white">Locations</CardTitle>
                                        <CardDescription className="text-gray-300">
                                            Manage maintenance locations
                                        </CardDescription>
                                    </CardHeader>
                                    <CardContent>
                                        <div className="space-y-4">
                                            {locations.map((location) => (
                                                <div
                                                    key={location.id}
                                                    className="flex items-center justify-between p-2 border border-gray-700 rounded-lg bg-[#0a1e46]"
                                                >
                                                    <span className="text-white">{location.name}</span>
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        className="text-gray-300 hover:text-white hover:bg-[#0a1e46]"
                                                    >
                                                        Edit
                                                    </Button>
                                                </div>
                                            ))}
                                            <Button className="w-full bg-blue-600 hover:bg-blue-700">
                                                Add Location
                                            </Button>
                                        </div>
                                    </CardContent>
                                </Card>
                            </TabsContent>
                        </div>
                    </Tabs>
                </div>
            </DialogContent>
        </Dialog >

    );
}