// src/components/MaintenanceDashboard.jsx
import React, { useState, useEffect } from 'react';
import { ref, onValue } from 'firebase/database';
import { database } from '@/config/firebase';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Select } from './ui/select';
import TicketActionModal from './tickets/TicketActionModal';
import { Clock, AlertCircle, CheckCircle2, Wrench, User } from 'lucide-react';

const MaintenanceDashboard = () => {
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [filterStaff, setFilterStaff] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');

  useEffect(() => {
    const ticketsRef = ref(database, 'tickets');  // Using the imported 'database'
    const unsubscribe = onValue(ticketsRef, (snapshot) => {
      if (snapshot.exists()) {
        const ticketsData = snapshot.val();
        const ticketsArray = Object.entries(ticketsData).map(([key, value]) => ({
          id: key,
          ...value
        })).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        setTickets(ticketsArray);
      } else {
        setTickets([]);
      }
      setLoading(false);
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
    high: tickets.filter(t => t.priority === 'high').length
  };

  const filteredTickets = tickets.filter(ticket => {
    if (filterStaff !== 'all' && ticket.assignedTo !== filterStaff) return false;
    if (filterStatus !== 'all' && ticket.status !== filterStatus) return false;
    return true;
  });


  return (
    <div className="container mx-auto p-6">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">Maintenance Dashboard</h1>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">New Tickets</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center">
              <Clock className="w-4 h-4 text-blue-500 mr-2" />
              <span className="text-2xl font-bold">{stats.new}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">In Progress</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center">
              <Wrench className="w-4 h-4 text-yellow-500 mr-2" />
              <span className="text-2xl font-bold">{stats.inProgress}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Completed</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center">
              <CheckCircle2 className="w-4 h-4 text-green-500 mr-2" />
              <span className="text-2xl font-bold">{stats.completed}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">High Priority</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center">
              <AlertCircle className="w-4 h-4 text-red-500 mr-2" />
              <span className="text-2xl font-bold">{stats.high}</span>
            </div>
          </CardContent>
        </Card>
      </div>
      {/* Filters */}
      <div className="flex gap-4 mb-6">
        <Select
          value={filterStaff}
          onValueChange={setFilterStaff}
          className="w-[200px]"
        >
          <SelectTrigger>
            <SelectValue placeholder="Filter by staff" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Staff</SelectItem>
            {STAFF_MEMBERS.map((staff) => (
              <SelectItem key={staff.id} value={staff.id}>
                {staff.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={filterStatus}
          onValueChange={setFilterStatus}
          className="w-[200px]"
        >
          <SelectTrigger>
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            {TICKET_STATUSES.map((status) => (
              <SelectItem key={status.value} value={status.value}>
                {status.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-4">
        {filteredTickets.map((ticket) => (
          <Card
            key={ticket.id}
            className="hover:bg-gray-50 cursor-pointer"
            onClick={() => setSelectedTicket(ticket)}
          >
            <CardContent className="p-6">
              {/* ... your existing ticket card content ... */}
              <div className="mt-4 flex justify-between items-center">
                <div className="flex items-center space-x-2">
                  {ticket.assignedTo && (
                    <div className="flex items-center text-sm text-gray-500">
                      <User className="w-4 h-4 mr-1" />
                      {STAFF_MEMBERS.find(s => s.id === ticket.assignedTo)?.name || 'Unassigned'}
                    </div>
                  )}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedTicket(ticket);
                  }}
                >
                  Manage
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {selectedTicket && (
        <TicketActionModal
          ticket={selectedTicket}
          isOpen={!!selectedTicket}
          onClose={() => setSelectedTicket(null)}
        />
      )}
    </div>
  );
};

export default MaintenanceDashboard;