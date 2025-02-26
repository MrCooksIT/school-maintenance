// src/components/admin/Analytics.jsx
import React, { useState, useEffect } from 'react';
import { ref, onValue } from 'firebase/database';
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
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

const MetricCard = ({ title, value, subValue, trend, trendValue }) => (
    <div className="p-4 bg-white rounded-lg border">
        <h4 className="text-sm text-gray-600 mb-1">{title}</h4>
        <div className="flex items-end justify-between">
            <div>
                <p className="text-2xl font-semibold">{value}</p>
                <p className="text-sm text-gray-500">{subValue}</p>
            </div>
            <div className={`flex items-center gap-1 text-sm ${trend === 'up' ? 'text-red-500' :
                trend === 'down' ? 'text-green-500' :
                    'text-gray-500'
                }`}>
                {trend === 'up' ? <TrendingUp className="h-4 w-4" /> :
                    trend === 'down' ? <TrendingDown className="h-4 w-4" /> :
                        <Minus className="h-4 w-4" />}
                {trendValue}
            </div>
        </div>
    </div>
);

const Analytics = () => {
    const [tickets, setTickets] = useState([]);
    const [currentStaff, setCurrentStaff] = useState([]);

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
            }
        });

        return () => unsubscribe();
    }, []);

    const calculateAnalytics = () => {
        if (!tickets.length) return {
            staffPerformance: [],
            monthlyTrends: [],
            topPerformer: { name: 'No data', avgTime: 0 },
            overallAvg: 0,
            openTickets: 0,
            pausedTickets: 0
        };

        const staffPerformance = currentStaff.map(staff => {
            const staffTickets = tickets.filter(t => t.assignedTo === staff.id);
            const activeTickets = staffTickets.filter(t => t.status !== 'completed' && t.status !== 'paused');
            const pausedTickets = staffTickets.filter(t => t.status === 'paused');
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
                activeTickets: activeTickets.length,
                pausedTickets: pausedTickets.length,
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
                paused: monthTickets.filter(t => t.status === 'paused').length,
                avgResolutionTime: calculateAvgResolutionTime(monthTickets),
                highPriority: monthTickets.filter(t => t.priority === 'high').length
            };
        }).reverse();

        const openTickets = tickets.filter(t => t.status !== 'completed' && t.status !== 'paused');
        const pausedTickets = tickets.filter(t => t.status === 'paused');

        const bestPerformer = staffPerformance.reduce((best, current) => {
            if (current.completedTickets === 0) return best;
            const bestScore = best.completedTickets / (best.avgTime || 1);
            const currentScore = current.completedTickets / (current.avgTime || 1);
            return currentScore > bestScore ? current : best;
        }, staffPerformance[0] || { name: 'No data', avgTime: 0 });

        return {
            staffPerformance,
            monthlyTrends,
            topPerformer: bestPerformer,
            overallAvg: calculateAvgResolutionTime(tickets),
            openTickets: openTickets.length,
            pausedTickets: pausedTickets.length
        };
    };

    const calculateAvgResolutionTime = (tickets) => {
        const completedTickets = tickets.filter(t => t.status === 'completed');
        if (!completedTickets.length) return 0;

        const totalTime = completedTickets.reduce((acc, ticket) => {
            const created = new Date(ticket.createdAt);
            const completed = new Date(ticket.lastUpdated);
            return acc + (completed - created) / (1000 * 60 * 60);
        }, 0);

        return Math.round(totalTime / completedTickets.length);
    };

    const {
        staffPerformance,
        monthlyTrends,
        topPerformer,
        overallAvg,
        openTickets
    } = calculateAnalytics();

    return (
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

            <div className="grid grid-cols-2 gap-6">
                <Card>
                    <CardHeader>
                        <CardTitle>Average Resolution Time by Staff</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="h-[400px]">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={staffPerformance}>
                                    <XAxis dataKey="name" />
                                    <YAxis tickFormatter={(value) => `${value}h`} />
                                    <Tooltip />
                                    <Bar dataKey="avgTime" fill="#3b82f6">
                                        <LabelList dataKey="avgTime" position="top" />
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>Monthly Resolution Trends</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="h-[400px]">
                            <ResponsiveContainer width="100%" height="100%">
                                <LineChart data={monthlyTrends}>
                                    <XAxis dataKey="month" />
                                    <YAxis />
                                    <Tooltip />
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
        </div>
    );
};

export default Analytics;