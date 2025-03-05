// src/components/admin/Calendar.jsx
import React, { useState, useEffect } from 'react';
import { ref, onValue } from 'firebase/database';
import { database } from '@/config/firebase';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isToday, isSameMonth } from 'date-fns';
import { ChevronLeft, ChevronRight, AlertCircle } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip";

const Calendar = () => {
    const [currentDate, setCurrentDate] = useState(new Date());
    const [tickets, setTickets] = useState([]);

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

    const daysInMonth = eachDayOfInterval({
        start: startOfMonth(currentDate),
        end: endOfMonth(currentDate)
    });

    const previousMonth = () => {
        setCurrentDate(prev => new Date(prev.getFullYear(), prev.getMonth() - 1));
    };

    const nextMonth = () => {
        setCurrentDate(prev => new Date(prev.getFullYear(), prev.getMonth() + 1));
    };

    const getDayTickets = (date) => {
        return tickets.filter(ticket => {
            if (!ticket.dueDate) return false;
            const dueDate = new Date(ticket.dueDate);
            return dueDate.toDateString() === date.toDateString();
        });
    };

    // Fixed function - removed dependency on undefined 'ticket' variable
    const getPriorityColor = (priority, status) => {
        if (status === 'paused') {
            return 'bg-purple-500';
        }
        switch (priority) {
            case 'high': return 'bg-red-500';
            case 'medium': return 'bg-yellow-500';
            case 'low': return 'bg-green-500';
            default: return 'bg-blue-500';
        }
    };

    return (
        <div className="p-4">
            <Card className="p-6">
                <div className="flex items-center justify-between mb-6">
                    <h2 className="text-2xl font-bold">
                        {format(currentDate, 'MMMM yyyy')}
                    </h2>
                    <div className="flex gap-2">
                        <Button
                            variant="outline"
                            size="icon"
                            onClick={previousMonth}
                        >
                            <ChevronLeft className="h-4 w-4" />
                        </Button>
                        <Button
                            variant="outline"
                            size="icon"
                            onClick={nextMonth}
                        >
                            <ChevronRight className="h-4 w-4" />
                        </Button>
                    </div>
                </div>

                <div className="grid grid-cols-7 gap-px bg-gray-200">
                    {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                        <div
                            key={day}
                            className="bg-white p-2 text-center text-sm font-semibold"
                        >
                            {day}
                        </div>
                    ))}

                    {Array.from({ length: startOfMonth(currentDate).getDay() }).map((_, index) => (
                        <div key={`empty-${index}`} className="bg-white p-4" />
                    ))}

                    {daysInMonth.map((date, index) => {
                        const dayTickets = getDayTickets(date);
                        return (
                            <div
                                key={index}
                                className={`bg-white p-4 min-h-[120px] border ${isToday(date) ? 'border-blue-500' : 'border-transparent'
                                    } ${!isSameMonth(date, currentDate) ? 'text-gray-400' : ''}`}
                            >
                                <div className="font-medium mb-2">
                                    {format(date, 'd')}
                                </div>
                                <div className="space-y-1">
                                    {dayTickets.map(ticket => (
                                        <TooltipProvider key={ticket.id}>
                                            <Tooltip>
                                                <TooltipTrigger>
                                                    <div className={`text-xs p-1 rounded ${getPriorityColor(ticket.priority, ticket.status)} text-white truncate`}>
                                                        {ticket.status === 'paused' ? '⏸ ' : ''}{ticket.subject}
                                                    </div>
                                                </TooltipTrigger>
                                                <TooltipContent>
                                                    <div className="p-2">
                                                        <p className="font-semibold">{ticket.subject}</p>
                                                        <p className="text-sm">{ticket.description}</p>
                                                        <div className="flex items-center gap-1 mt-1 text-sm">
                                                            <AlertCircle className="h-4 w-4" />
                                                            {ticket.priority} priority
                                                        </div>
                                                    </div>
                                                </TooltipContent>
                                            </Tooltip>
                                        </TooltipProvider>
                                    ))}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </Card>
        </div>
    );
};

export default Calendar;