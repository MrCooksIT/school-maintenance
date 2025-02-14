// src/components/StaffDashboard.jsx
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';

const StaffDashboard = ({ tickets, staffMember }) => {
    const staffTickets = tickets.filter(ticket => ticket.assignedTo === staffMember.id);

    const stats = {
        active: staffTickets.filter(t => t.status !== 'completed').length,
        completed: staffTickets.filter(t => t.status === 'completed').length,
        highPriority: staffTickets.filter(t => t.priority === 'high').length
    };

    return (
        <div className="space-y-6">
            <h2 className="text-2xl font-bold">
                {staffMember.name}'s Dashboard
            </h2>

            <div className="grid grid-cols-3 gap-4">
                <Card>
                    <CardHeader>
                        <CardTitle className="text-sm">Active Tasks</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats.active}</div>
                    </CardContent>
                </Card>
                {/* ... similar cards for other stats ... */}
            </div>

            <div className="space-y-4">
                {staffTickets.map(ticket => (
                    <Card key={ticket.id}>
                        {/* ... ticket details ... */}
                    </Card>
                ))}
            </div>
        </div>
    );
};

export default StaffDashboard;