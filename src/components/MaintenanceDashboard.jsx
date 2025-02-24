import TicketDetailsModal from './tickets/TicketDetailsModal';
import React, { useState, useEffect } from 'react';
import { ref, onValue, update } from 'firebase/database';
import { database } from '@/config/firebase';
import {
  Filter,
  MoreVertical,
  MessageSquare,
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
import { RefreshCw } from 'lucide-react';
import { useToast } from "@/components/ui/use-toast"

// Constants
const STATUS_OPTIONS = [
  { value: 'new', label: 'New' },
  { value: 'in-progress', label: 'In Progress' },
  { value: 'completed', label: 'Completed' },
  { value: 'overdue', label: 'Overdue' }
];
//
const PRIORITY_OPTIONS = [
  { value: 'high', label: 'High' },
  { value: 'medium', label: 'Medium' },
  { value: 'low', label: 'Low' }
];
//Status
const StatusBadge = ({ status }) => {
  const statusStyles = {
    new: "bg-blue-100 text-blue-800 border-blue-200",
    "in-progress": "bg-yellow-100 text-yellow-800 border-yellow-200",
    completed: "bg-green-100 text-green-800 border-green-200",
    overdue: "bg-Red-100 text-Red-800 border-Red-200"
  };

  return (
    <Badge className={`${statusStyles[status]} text-xs uppercase`}>
      {status}
    </Badge>
  );
};

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

// TicketRow Component

const TicketRow = ({ ticket, onTicketClick, staffMembers }) => {
  const [editedData, setEditedData] = useState(ticket);
  return (
    <tr className="hover:bg-gray-50 cursor-pointer" onClick={() => onTicketClick(ticket)}>
        <td className="px-4 py-2 text-sm">
            {typeof ticket.requester === 'object'
                ? `${ticket.requester.name || ''} ${ticket.requester.surname || ''}`
                : ticket.requester}
        </td>

        <td className="px-4 py-2 text-sm">
            {ticket.dueDate || 'No due date'}
        </td>

        <td className="px-4 py-2 text-sm font-mono">{ticket.ticketId}</td>

        <td className="px-4 py-2">
            <StatusBadge status={ticket.status} />
        </td>

        <td className="px-4 py-2 text-sm">
            {ticket.subject}
        </td>

        <td className="px-4 py-2 text-sm">
            {ticket.description}
        </td>

        <td className="px-4 py-2">
            <PriorityBadge priority={ticket.priority} />
        </td>

        <td className="px-4 py-2">
            {ticket.assignedTo ? (
                <Badge variant="outline">
                    {staffMembers.find(s => s.id === ticket.assignedTo)?.name || 'Unknown'}
                </Badge>
            ) : (
                <Badge variant="secondary">Unassigned</Badge>
            )}
        </td>

        <td className="px-4 py-2 text-sm">
            {ticket.completedAt ? (
                new Date(ticket.completedAt).toLocaleString('en-GB', {
                    dateStyle: 'medium',
                    timeStyle: 'short'
                })
            ) : (
                '-'
            )}
        </td>

        <td className="px-4 py-2">
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
  const [filterPriority, setFilterPriority] = useState('all');
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


  const handleSync = async () => {
    setIsSyncing(true);
    try {
      // Add loading state visual feedback
      toast({
        title: "Syncing...",
        description: "Please wait while we sync your tickets",
      });

      // Your sync logic here
      await Promise.all([
        fetch(`${scriptUrl}?function=onNewEmail`),
        fetch(`${scriptUrl}?function=checkStatusChanges`),
        fetch(`${scriptUrl}?function=cleanupDuplicateTickets`)
      ]);

      // Refresh the data
      const ticketsRef = ref(database, 'tickets');
      onValue(ticketsRef, (snapshot) => {
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

      toast({
        title: "Sync Complete",
        description: "Your tickets have been updated",
        variant: "success",
      });
    } catch (error) {
      toast({
        title: "Sync Failed",
        description: "There was an error syncing your tickets",
        variant: "destructive",
      });
    } finally {
      setIsSyncing(false);
    }
  };

  useEffect(() => {
    const ticketsRef = ref(database, 'tickets');
    const unsubscribe = onValue(ticketsRef, (snapshot) => {
      if (snapshot.exists()) {
        const ticketsData = snapshot.val();
        const ticketsArray = Object.entries(ticketsData)
          .map(([id, value]) => ({
            id,
            ...value
          }))
          .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        setTickets(ticketsArray);
      }
    });

    return () => unsubscribe();
  }, []);

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
    // Status filter
    const matchesStatus = filterStatus === 'all'
      ? true
      : filterStatus === 'open'
        ? ticket.status !== 'completed'
        : ticket.status === 'completed';

    // Priority filter
    const matchesPriority = filterPriority === 'all'
      ? true
      : ticket.priority === filterPriority;

    // Submitter search
    const matchesSearch = searchQuery
      ? (typeof ticket.requester === 'object'
        ? `${ticket.requester.name || ''} ${ticket.requester.surname || ''}`
        : ticket.requester || ''
      ).toLowerCase().includes(searchQuery.toLowerCase())
      : true;

    return matchesStatus && matchesPriority && matchesSearch;
  });
  const handleTicketClick = (ticket) => {
    setSelectedTicket(ticket);
    setCommentModalOpen(true);
  };

  const handleClearFilters = () => {
    setSearchQuery('');
    setFilterStatus('open');
    setFilterPriority('all');
  };

  return (
    <div className="p-6">
      <div className="mb-6">
        {/* Filter Section */}
        <div className="flex items-center justify-between mb-4 bg-white p-4 rounded-lg shadow-sm">
          <div className="flex gap-2">
            <Button
              variant={filterStatus === 'open' ? 'default' : 'outline'}
              onClick={() => setFilterStatus('open')}
              className="bg-marist text-white hover:bg-marist-light"
            >
              Open
            </Button>
            <Button
              variant={filterStatus === 'closed' ? 'default' : 'outline'}
              onClick={() => setFilterStatus('closed')}
            >
              Closed
            </Button>
          </div>
          <div className="flex items-center justify-between mb-4 bg-white p-4 rounded-lg shadow-sm">
            <div className="flex items-center gap-4">
              <Select
                value={filterStatus}
                onValueChange={setFilterStatus}
              >
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="open">Open</SelectItem>
                  <SelectItem value="closed">Closed</SelectItem>
                  <SelectItem value="all">All</SelectItem>
                </SelectContent>
              </Select>

              <Select
                value={filterPriority}
                onValueChange={setFilterPriority}
              >
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder="Priority" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Priority</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="low">Low</SelectItem>
                </SelectContent>
              </Select>

              <Input
                placeholder="Search by submitter..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="max-w-xs"
              />

              <Button
                variant="outline"
                className="flex items-center gap-2"
                onClick={handleClearFilters}
              >
                <Filter className="h-4 w-4" />
                Clear
              </Button>
            </div>
          </div>
        </div>
        {/* Tickets Count */}
        <div className="flex items-center gap-2 mb-4">
          <h2 className="text-lg font-semibold">Tickets</h2>
          <Badge variant="secondary">{filteredTickets.length}</Badge>
        </div>
        <div className="flex-1" />

        {/* Add this Sync button */}
        <Button
          variant="outline"
          onClick={handleSync}
          disabled={isSyncing}
          className="flex items-center gap-2"
        >
          <RefreshCw className={`h-4 w-4 ${isSyncing ? 'animate-spin' : ''}`} />
          {isSyncing ? 'Syncing...' : 'Sync Email Tickets'}
        </Button>

        <div className="bg-white rounded-lg border shadow-sm overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                {/* Table Headers */}
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Reported By</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Due Date</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Ticket Number</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Status</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Title</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Description</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Priority</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Assigned To</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Completed</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredTickets.map(ticket => (
                <TicketRow
                  key={ticket.id}
                  ticket={ticket}
                  onTicketClick={handleTicketClick}
                  staffMembers={staffMembers}
                />
              ))}
            </tbody>
          </table>
        </div>

        <TicketDetailsModal
          ticket={selectedTicket}
          isOpen={commentModalOpen}
          onClose={() => setCommentModalOpen(false)}
          staffMembers={staffMembers}
        />
      </div>
    </div>
  );
};

export default MaintenanceDashboard;