// src/components/MaintenanceDashboard.jsx
import React, { useState, useEffect } from 'react';
import { ref, onValue } from 'firebase/database';
import { database } from '@/config/firebase';  // Using @ alias
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';  // Relative path for components
import { Badge } from './ui/badge';  // Relative path for components

const MaintenanceDashboard = () => {
  const [tickets, setTickets] = useState([]);

  useEffect(() => {
    const ticketsRef = ref(database, 'tickets');  // Using the imported 'database'
    const unsubscribe = onValue(ticketsRef, (snapshot) => {
      if (snapshot.exists()) {
        const ticketsData = snapshot.val();
        const ticketsArray = Object.entries(ticketsData).map(([key, value]) => ({
          firebaseKey: key,
          ...value
        })).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        setTickets(ticketsArray);
      }
    });

    return () => unsubscribe();
  }, []);


  const getStatusIcon = (status) => {
    switch (status) {
      case 'new': return <Clock className="h-4 w-4 text-blue-500" />;
      case 'in-progress': return <Wrench className="h-4 w-4 text-yellow-500" />;
      case 'completed': return <CheckCircle2 className="h-4 w-4 text-green-500" />;
      default: return null;
    }
  };

  const getPriorityStyle = (priority) => {
    switch (priority) {
      case 'high': return 'bg-red-100 text-red-700 border-red-200';
      case 'medium': return 'bg-yellow-100 text-yellow-700 border-yellow-200';
      case 'low': return 'bg-green-100 text-green-700 border-green-200';
      default: return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  // Calculate stats
  const stats = {
    new: tickets.filter(t => t.status === 'new').length,
    inProgress: tickets.filter(t => t.status === 'in-progress').length,
    completed: tickets.filter(t => t.status === 'completed').length,
    total: tickets.length
  };

  return (
    <div className="container mx-auto p-6">
      <h1 className="text-3xl font-bold mb-8">Maintenance Dashboard</h1>

      {/* Stats Overview */}
      <div className="grid gap-6 md:grid-cols-4 mb-8">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">New Tickets</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.new}</div>
          </CardContent>
        </Card>

        {/* Similar cards for other stats */}
      </div>

      {/* Tickets List */}
      <div className="space-y-4">
        {tickets.map((ticket) => (
          <Card key={ticket.firebaseKey} className="hover:bg-gray-50">
            <CardContent className="p-6">
              <div className="flex justify-between items-start mb-2">
                <div className="flex items-center space-x-2">
                  <Badge variant="outline">{ticket.ticketId}</Badge>
                  <Badge className={getPriorityStyle(ticket.priority)}>
                    {ticket.priority?.toUpperCase()}
                  </Badge>
                </div>
                <div className="flex items-center space-x-2">
                  {getStatusIcon(ticket.status)}
                  <span className="text-sm font-medium capitalize">{ticket.status}</span>
                </div>
              </div>

              <h3 className="font-semibold mb-1">{ticket.subject}</h3>
              <p className="text-sm text-gray-600 mb-2">{ticket.description}</p>

              <div className="grid grid-cols-2 gap-4 text-sm text-gray-500">
                <div>
                  <span className="font-medium">Location: </span>
                  {ticket.location}
                </div>
                <div>
                  <span className="font-medium">Requester: </span>
                  {ticket.requester.name}
                </div>
                <div>
                  <span className="font-medium">Created: </span>
                  {new Date(ticket.createdAt).toLocaleString()}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default MaintenanceDashboard;