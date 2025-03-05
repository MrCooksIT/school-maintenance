// src/components/MaintenanceDashboard.jsx
import React, { useState, useEffect } from 'react';
import { ref, onValue, update } from 'firebase/database';
import { database } from '@/config/firebase';
import TicketDetailsModal from './tickets/TicketDetailsModal';
import { DateRangePicker } from './DateRangePicker';
import { format } from 'date-fns';
import { processTicketCategories } from '@/components/utils/categoryHelpers';
import {
  Filter,
  MessageSquare,
  RefreshCw,
  Search,
  Sliders,
  X,
} from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Badge } from './ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './ui/select';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from './ui/popover';
import { useToast } from "@/components/ui/use-toast";

// Status Badge Component
const StatusBadge = ({ status }) => {
  const statusStyles = {
    new: "bg-blue-100 text-blue-800 border-blue-200",
    "in-progress": "bg-yellow-100 text-yellow-800 border-yellow-200",
    "paused": "bg-purple-100 text-purple-800 border-purple-200",
    completed: "bg-green-100 text-green-800 border-green-200",
    overdue: "bg-red-100 text-red-800 border-red-200"
  };

  const getDisplayText = (status) => {
    switch (status) {
      case 'in-progress': return 'IN PROGRESS';
      case 'paused': return 'PAUSED';
      default: return status?.toUpperCase();
    }
  };

  return (
    <Badge className={`${statusStyles[status]} text-xs uppercase`}>
      {getDisplayText(status)}
    </Badge>
  );
};

// Priority Badge Component
const PriorityBadge = ({ priority }) => {
  const priorityStyles = {
    high: "bg-red-100 text-red-800 border-red-200",
    medium: "bg-orange-100 text-orange-800 border-orange-200",
    low: "bg-green-100 text-green-800 border-green-200"
  };

  return (
    <Badge className={`${priorityStyles[priority]} text-xs uppercase`}>
      {priority}
    </Badge>
  );
};

// Ticket Row Component
const TicketRow = ({ ticket, onTicketClick, staffMembers }) => {
  return (
    <tr
      className="hover:bg-gray-50 cursor-pointer border-b transition-colors"
      onClick={() => onTicketClick(ticket)}
    >
      <td className="px-4 py-3 text-sm">
        {typeof ticket.requester === 'object'
          ? `${ticket.requester.name || ''} ${ticket.requester.surname || ''}`
          : ticket.requester}
      </td>
      <td className="px-4 py-3 text-sm">
        {ticket.dueDate ? format(new Date(ticket.dueDate), 'dd/MM/yyyy') : '-'}
      </td>
      <td className="px-4 py-3 text-sm font-mono">{ticket.ticketId}</td>
      <td className="px-4 py-3">
        <StatusBadge status={ticket.status} />
      </td>
      <td className="px-4 py-3 text-sm font-medium">{ticket.subject}</td>
      <td className="px-4 py-3">
        <PriorityBadge priority={ticket.priority} />
      </td>
      <td className="px-4 py-3">
        {ticket.assignedTo ? (
          <Badge variant="outline" className="bg-blue-50">
            {staffMembers.find(s => s.id === ticket.assignedTo)?.name || 'Unknown'}
          </Badge>
        ) : (
          <Badge variant="secondary">Unassigned</Badge>
        )}
      </td>
      <td className="px-4 py-3 text-sm">
        {ticket.completedAt ? (new Date(ticket.createdAt).toLocaleString('en-GB')) : (
          '-'
        )}
      </td>
      <td className="px-4 py-3 text-right">
        <Button
          size="sm"
          variant="ghost"
          onClick={(e) => {
            e.stopPropagation();
            onTicketClick(ticket);
          }}
        >
          <MessageSquare className="h-4 w-4" />
        </Button>
      </td>
    </tr>
  );
};

const MaintenanceDashboard = () => {
  const [tickets, setTickets] = useState([]);
  const [filterStatus, setFilterStatus] = useState('open');
  const [commentModalOpen, setCommentModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [staffMembers, setStaffMembers] = useState([]);
  const [isSyncing, setIsSyncing] = useState(false);
  const { toast } = useToast();
  const [dateRange, setDateRange] = useState({
    from: new Date(new Date().setMonth(new Date().getMonth() - 1)),
    to: new Date()
  });
  const [advancedFilters, setAdvancedFilters] = useState({
    priority: '',
    location: '',
    assignee: ''
  });
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [processedCategories, setProcessedCategories] = useState({});

  const handleSync = async () => {
    setIsSyncing(true);
    try {
      toast({
        title: "Syncing Tickets",
        description: "Please wait while we sync your tickets...",
        variant: "info",
      });

      // Your actual sync logic here
      await new Promise(resolve => setTimeout(resolve, 1500)); // Simulating API call

      toast({
        title: "Sync Complete",
        description: "Your tickets have been updated successfully",
        variant: "success",
      });
    } catch (error) {
      console.error('Error syncing tickets:', error);
      toast({
        title: "Sync Failed",
        description: "There was an error syncing your tickets",
        variant: "destructive",
      });
    } finally {
      setIsSyncing(false);
    }
  };

  const clearFilters = () => {
    setSearchQuery('');
    setAdvancedFilters({
      priority: '',
      location: '',
      assignee: ''
    });
    setDateRange({
      from: new Date(new Date().setMonth(new Date().getMonth() - 1)),
      to: new Date()
    });
  };

  useEffect(() => {
    const ticketsRef = ref(database, 'tickets');
    const unsubscribe = onValue(ticketsRef, (snapshot) => {
      if (snapshot.exists()) {
        const ticketsData = Object.entries(snapshot.val())
          .map(([id, value]) => ({
            id,
            ...value
          }))
          .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        setTickets(ticketsData);
      }
    });

    return () => unsubscribe();
  }, []);

  // Process tickets to auto-create categories
  useEffect(() => {
    // Skip if no tickets
    if (!tickets.length) return;
    
    const processCategoriesAsync = async () => {
      try {
        // Process new categories from tickets
        const updatedProcessed = await processTicketCategories(
          database, 
          tickets, 
          processedCategories,
          toast // Pass the toast function for notifications
        );
        
        // Update processed categories tracker
        setProcessedCategories(updatedProcessed);
      } catch (error) {
        console.error("Error processing categories:", error);
      }
    };

    processCategoriesAsync();
  }, [tickets, processedCategories, toast]);

  useEffect(() => {
    // Load staff members
    const staffRef = ref(database, 'staff');
    const unsubscribe = onValue(staffRef, (snapshot) => {
      if (snapshot.exists()) {
        const staffData = Object.entries(snapshot.val()).map(([id, data]) => ({
          id,
          ...data,
        }));
        setStaffMembers(staffData);
      }
    });

    return () => unsubscribe();
  }, []);

  const filteredTickets = tickets.filter(ticket => {
    // Status filter (open/closed)
    const statusMatch = filterStatus === 'open'
      ? ticket.status !== 'completed'
      : ticket.status === 'completed';

    // Search query
    const searchMatch = searchQuery
      ? Object.values(ticket).some(value =>
        String(value).toLowerCase().includes(searchQuery.toLowerCase())
      )
      : true;

    // Date range
    const ticketDate = new Date(ticket.createdAt);
    const dateMatch = (!dateRange.from || ticketDate >= dateRange.from) &&
      (!dateRange.to || ticketDate <= dateRange.to);

    // Advanced filters
    const priorityMatch = !advancedFilters.priority || ticket.priority === advancedFilters.priority;
    const locationMatch = !advancedFilters.location ||
      (ticket.location && ticket.location.toLowerCase().includes(advancedFilters.location.toLowerCase()));
    const assigneeMatch = !advancedFilters.assignee || ticket.assignedTo === advancedFilters.assignee;

    return statusMatch && searchMatch && dateMatch && priorityMatch && locationMatch && assigneeMatch;
  });

  const handleTicketClick = (ticket) => {
    setSelectedTicket(ticket);
    setCommentModalOpen(true);
  };

  return (
    <div className="p-4 md:p-6 max-w-[1600px] mx-auto">
      {/* Top section with filters */}
      <div className="mb-6 bg-white p-4 rounded-lg shadow-sm">
        <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
          {/* Status toggle */}
          <div className="flex gap-2 p-1 bg-gray-100 rounded-lg shadow-inner">
            <Button
              variant={filterStatus === 'open' ? 'default' : 'ghost'}
              onClick={() => setFilterStatus('open')}
              className={filterStatus === 'open' ? "bg-[#0a1e46] text-white" : "text-gray-600"}
              size="sm"
            >
              Open Tickets
            </Button>
            <Button
              variant={filterStatus === 'closed' ? 'default' : 'ghost'}
              onClick={() => setFilterStatus('closed')}
              className={filterStatus === 'closed' ? "bg-[#0a1e46] text-white" : "text-gray-600"}
              size="sm"
            >
              Closed Tickets
            </Button>
          </div>

          {/* Search and filters */}
          <div className="flex flex-1 flex-col md:flex-row gap-3 md:max-w-2xl lg:max-w-3xl">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search tickets..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 w-full"
              />
              {searchQuery && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="absolute right-2 top-1/2 transform -translate-y-1/2 h-6 w-6 p-0"
                  onClick={() => setSearchQuery('')}
                >
                  <X className="h-3 w-3" />
                </Button>
              )}
            </div>

            <DateRangePicker
              dateRange={dateRange}
              onUpdate={setDateRange}
              className="flex-1"
            />

            <Popover open={showAdvancedFilters} onOpenChange={setShowAdvancedFilters}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className="relative"
                  size="sm"
                >
                  <Sliders className="h-4 w-4 mr-2" />
                  Advanced Filters
                  {(advancedFilters.priority || advancedFilters.location || advancedFilters.assignee) && (
                    <span className="absolute top-0 right-0 -mt-1 -mr-1 h-3 w-3 rounded-full bg-blue-500"></span>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-80 p-4 bg-white border shadow-lg z-50">
                <div className="space-y-4">
                  <h3 className="font-medium">Advanced Filters</h3>

                  <div className="space-y-2">
                    <label className="text-sm text-gray-500">Priority</label>
                    <Select
                      value={advancedFilters.priority}
                      onValueChange={(value) => setAdvancedFilters(prev => ({ ...prev, priority: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Any priority" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">Any priority</SelectItem>
                        <SelectItem value="high">High</SelectItem>
                        <SelectItem value="medium">Medium</SelectItem>
                        <SelectItem value="low">Low</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm text-gray-500">Location</label>
                    <Input
                      placeholder="Filter by location"
                      value={advancedFilters.location}
                      onChange={(e) => setAdvancedFilters(prev => ({ ...prev, location: e.target.value }))}
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm text-gray-500">Assigned To</label>
                    <Select
                      value={advancedFilters.assignee}
                      onValueChange={(value) => setAdvancedFilters(prev => ({ ...prev, assignee: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Any staff member" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">Any staff member</SelectItem>
                        <SelectItem value="unassigned">Unassigned</SelectItem>
                        {staffMembers.map(staff => (
                          <SelectItem key={staff.id} value={staff.id}>
                            {staff.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="flex justify-between pt-2">
                    <Button variant="outline" size="sm" onClick={clearFilters}>
                      Reset Filters
                    </Button>
                    <Button size="sm" onClick={() => setShowAdvancedFilters(false)}>
                      Apply Filters
                    </Button>
                  </div>
                </div>
              </PopoverContent>
            </Popover>
          </div>

          {/* Sync button */}
          <Button
            variant="outline"
            size="sm"
            onClick={handleSync}
            disabled={isSyncing}
            className="whitespace-nowrap"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isSyncing ? 'animate-spin' : ''}`} />
            {isSyncing ? 'Syncing...' : 'Sync Tickets'}
          </Button>
        </div>
      </div>

      {/* Tickets count and filters bar */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <h2 className="text-lg font-semibold">Tickets</h2>
          <Badge variant="secondary">{filteredTickets.length}</Badge>
        </div>

        {/* Clear filters button - only shown when filters are active */}
        {(searchQuery || advancedFilters.priority || advancedFilters.location || advancedFilters.assignee) && (
          <Button
            variant="ghost"
            size="sm"
            onClick={clearFilters}
            className="text-sm"
          >
            <Filter className="h-3 w-3 mr-1" /> Clear Filters
          </Button>
        )}
      </div>

      {/* Tickets table */}
      <div className="bg-white rounded-lg border shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 text-left">
              <tr>
                <th className="px-4 py-3 text-sm font-medium text-gray-500">Reported By</th>
                <th className="px-4 py-3 text-sm font-medium text-gray-500">Due Date</th>
                <th className="px-4 py-3 text-sm font-medium text-gray-500">Ticket Number</th>
                <th className="px-4 py-3 text-sm font-medium text-gray-500">Status</th>
                <th className="px-4 py-3 text-sm font-medium text-gray-500">Title</th>
                <th className="px-4 py-3 text-sm font-medium text-gray-500">Priority</th>
                <th className="px-4 py-3 text-sm font-medium text-gray-500">Assigned To</th>
                <th className="px-4 py-3 text-sm font-medium text-gray-500">Completed</th>
                <th className="px-4 py-3 text-sm font-medium text-gray-500 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredTickets.length > 0 ? (
                filteredTickets.map(ticket => (
                  <TicketRow
                    key={ticket.id}
                    ticket={ticket}
                    onTicketClick={handleTicketClick}
                    staffMembers={staffMembers}
                  />
                ))
              ) : (
                <tr>
                  <td colSpan="9" className="px-4 py-8 text-center text-gray-500">
                    No tickets found matching your criteria
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Ticket details modal */}
      <TicketDetailsModal
        ticket={selectedTicket}
        isOpen={commentModalOpen}
        onClose={() => setCommentModalOpen(false)}
        staffMembers={staffMembers}
      />
    </div>
  );
};

export default MaintenanceDashboard;