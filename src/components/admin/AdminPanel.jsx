// src/components/admin/AdminPanel.jsx
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
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
    SheetTrigger,
} from "@/components/ui/sheet";
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
    Minus
} from 'lucide-react';
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle
} from "@/components/ui/card";

export function AdminPanel() {
    const [currentStaff, setCurrentStaff] = useState([]);
    const [tickets, setTickets] = useState([])
    const [newStaff, setNewStaff] = useState({
        name: '',
        department: '',
        email: ''
    });
    const [locations, setLocations] = useState([]);
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
    // Load staff from Firebase
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

    // Load locations from Firebase
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
            const newStaffMember = {
                name: newStaff.name,
                department: newStaff.department,
                email: newStaff.email,
                activeTickets: 0,
                createdAt: new Date().toISOString()
            };
            await push(staffRef, newStaffMember);
            setNewStaff({
                name: '',
                department: '',
                email: ''
            });
            alert('Staff member added successfully!');
        } catch (error) {
            console.error('Error adding staff:', error);
            alert('Failed to add staff member. Please try again.');
        }
    };

    const handleAddLocation = async (locationName) => {
        if (!locationName) return;

        try {
            const locationsRef = ref(database, 'locations');
            await push(locationsRef, {
                name: locationName,
                createdAt: new Date().toISOString()
            });
        } catch (error) {
            console.error('Error adding location:', error);
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
            const staffTickets = tickets.filter(t =>
                t.assignedTo === staff.id && t.status === 'completed'
            );

            const totalTime = staffTickets.reduce((acc, ticket) => {
                if (!ticket.completedAt) return acc; // Skip if no completedAt
                const created = new Date(ticket.createdAt);
                const completed = new Date(ticket.completedAt);
                return acc + (completed - created) / (1000 * 60 * 60);
            }, 0);

            return {
                name: staff.name,
                avgTime: staffTickets.length ? Math.round(totalTime / staffTickets.length) : 0,
                totalTickets: staffTickets.length
            };
        });
        // Calculate monthly trends
        const monthlyTrends = Array.from({ length: 6 }, (_, i) => {
            const date = new Date();
            date.setMonth(date.getMonth() - i);
            const month = date.toLocaleString('default', { month: 'short' });

            const monthTickets = tickets.filter(t => {
                const ticketDate = new Date(t.createdAt);
                return ticketDate.getMonth() === date.getMonth() &&
                    ticketDate.getFullYear() === date.getFullYear() &&
                    t.status === 'completed';
            });

            const totalTime = monthTickets.reduce((acc, ticket) => {
                const created = new Date(ticket.createdAt);
                const completed = new Date(ticket.completedAt);
                return acc + (completed - created) / (1000 * 60 * 60);
            }, 0);

            return {
                month,
                avgResolutionTime: monthTickets.length ? Math.round(totalTime / monthTickets.length) : 0,
                ticketCount: monthTickets.length
            };
        }).reverse();

        return {
            staffPerformance,
            monthlyTrends,
            topPerformer: staffPerformance.reduce((a, b) =>
                (a.avgTime < b.avgTime ? a : b), staffPerformance[0]),
            overallAvg: Math.round(
                staffPerformance.reduce((acc, staff) =>
                    acc + (staff.avgTime * staff.totalTickets), 0) /
                staffPerformance.reduce((acc, staff) =>
                    acc + staff.totalTickets, 0)
            ),
            openTickets: tickets.filter(t => t.status !== 'completed').length
        };
    };

    // Use the analytics in your component
    const {
        staffPerformance,
        monthlyTrends,
        topPerformer,
        overallAvg,
        openTickets
    } = calculateAnalytics();
    return (
        <Sheet>
            <SheetTrigger asChild>
                <Button variant="outline" size="icon">
                    <Settings className="h-4 w-4" />
                </Button>
            </SheetTrigger>
            <SheetContent className="w-[400px] sm:w-[540px] bg-[#0a1e46] text-white h-screen overflow-y-auto p-6">
                <SheetHeader>
                    <SheetTitle className="text-white">System Management</SheetTitle>
                </SheetHeader>

                <Tabs defaultValue="staff" className="mt-6">
                    <TabsList className="grid w-full grid-cols-4 bg-[#0f2a5e]">  {/* Change to grid-cols-4 */}
                        <TabsTrigger
                            value="staff"
                            className="text-gray-300 data-[state=active]:bg-[#0a1e46] data-[state=active]:text-white"
                        >
                            <Users className="h-4 w-4 mr-2" />
                            Staff
                        </TabsTrigger>
                        <TabsTrigger
                            value="workload"
                            className="text-gray-300 data-[state=active]:bg-[#0a1e46] data-[state=active]:text-white"
                        >
                            <Activity className="h-4 w-4 mr-2" />
                            Workload
                        </TabsTrigger>
                        <TabsTrigger
                            value="analytics"  // Add this
                            className="text-gray-300 data-[state=active]:bg-[#0a1e46] data-[state=active]:text-white"
                        >
                            <BarChart4 className="h-4 w-4 mr-2" />
                            Analytics
                        </TabsTrigger>
                        <TabsTrigger
                            value="locations"
                            className="text-gray-300 data-[state=active]:bg-[#0a1e46] data-[state=active]:text-white"
                        >
                            <Building className="h-4 w-4 mr-2" />
                            Locations
                        </TabsTrigger>
                    </TabsList>

                    <TabsContent value="staff" className="space-y-4 mt-4">
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
                                                    {staff.activeTickets} active tickets
                                                </span>
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => handleRemoveStaff(staff.id)}
                                                    className="text-red-400 hover:text-red-300 hover:bg-red-900/20"
                                                >
                                                    Remove
                                                </Button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </CardContent>
                        </Card>
                    </TabsContent>

                    <TabsContent value="workload">
                        <Card className="bg-[#0f2a5e] border-gray-700">
                            <CardHeader>
                                <CardTitle className="text-white">Staff Workload</CardTitle>
                                <CardDescription className="text-gray-300">
                                    Current ticket distribution
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-4">
                                    {currentStaff.map((staff) => (
                                        <div key={staff.id} className="space-y-1">
                                            <div className="flex items-center justify-between">
                                                <span className="text-sm font-medium text-white">{staff.name}</span>
                                                <span className="text-sm text-gray-300">
                                                    {staff.activeTickets} tickets
                                                </span>
                                            </div>
                                            <div className="h-2 bg-[#0a1e46] rounded-full overflow-hidden">
                                                <div
                                                    className="h-full rounded-full transition-all"
                                                    style={{
                                                        width: `${Math.min((staff.activeTickets / 5) * 100, 100)}%`,
                                                        backgroundColor: staff.activeTickets > 4 ? '#ef4444' : '#3b82f6'
                                                    }}
                                                />
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </CardContent>
                        </Card>
                    </TabsContent>
                    <TabsContent value="analytics">
                        <Card className="bg-[#0f2a5e] border-gray-700">
                            <CardHeader>
                                <CardTitle className="text-white">Ticket Analytics</CardTitle>
                                <CardDescription className="text-gray-300">
                                    Performance metrics and turnaround times
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-6">
                                    <div>
                                        <h3 className="text-sm font-medium text-white mb-3">Average Resolution Time by Staff</h3>
                                        <div className="h-[300px] w-full">
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
                                    </div>

                                    <div>
                                        <h3 className="text-sm font-medium text-white mb-3">Monthly Resolution Trends</h3>
                                        <div className="h-[300px] w-full">
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
                                    </div>

                                    <div className="grid grid-cols-3 gap-4">
                                        <MetricCard
                                            title="Best Performer"
                                            value={topPerformer.name}
                                            subValue={`${topPerformer.avgTime}h avg`}
                                            trend="down"
                                            trendValue="12%"
                                        />
                                        <MetricCard
                                            title="Avg Resolution Time"
                                            value={`${overallAvg}h`}
                                            subValue="All tickets"
                                            trend="up"
                                            trendValue="5%"
                                        />
                                        <MetricCard
                                            title="Open Tickets"
                                            value={openTickets}
                                            subValue="Pending resolution"
                                            trend="neutral"
                                            trendValue="0%"
                                        />
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </TabsContent>

                    <TabsContent value="locations">
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
                </Tabs>
            </SheetContent>
        </Sheet>
    );
}