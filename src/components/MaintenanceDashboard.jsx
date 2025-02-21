import { TicketDetailView } from './tickets/TicketDetailView';
import { Tabs, TabsList, TabsTrigger, TabsContent } from "./ui/tabs";
import React, { useState, useEffect } from 'react';
import { ref, onValue, update } from 'firebase/database';
import { database } from '@/config/firebase';
import { DateRangePicker } from './DateRangePicker';
import {
  Filter,
  Calendar,
  MoreVertical,
  CheckCircle2,
  Clock,
  X,
  MessageSquare,
  Edit2,
  Save,
  Building,
  User
} from 'lucide-react';
import { Textarea } from './ui/textarea';
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
import { TicketComments } from './tickets/TicketComments';
import { FileUpload } from './tickets/FileUpload';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogClose
} from './ui/dialog';
import { AdminPanel } from './admin/AdminPanel';

// Constants
const STATUS_OPTIONS = [
  { value: 'new', label: 'New' },
  { value: 'in-progress', label: 'In Progress' },
  { value: 'completed', label: 'Completed' }
];
const getPriorityStyle = (priority) => {
  const styles = {
    high: "bg-red-900/50 text-red-200 border-red-800",
    medium: "bg-yellow-900/50 text-yellow-200 border-yellow-800",
    low: "bg-green-900/50 text-green-200 border-green-800"
  };
  return styles[priority] || styles.medium;
};
const PRIORITY_OPTIONS = [
  { value: 'high', label: 'High' },
  { value: 'medium', label: 'Medium' },
  { value: 'low', label: 'Low' }
];
// Badge Components
const StatusBadge = ({ status }) => {
  const statusStyles = {
    new: "bg-blue-100 text-blue-800 border-blue-200",
    "in-progress": "bg-yellow-100 text-yellow-800 border-yellow-200",
    completed: "bg-green-100 text-green-800 border-green-200"
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
  const [isEditing, setIsEditing] = useState(false);
  const handleCellEdit = (field, value) => {
    setEditedData(prev => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    try {
      const ticketRef = ref(database, `tickets/${ticket.id}`);
      await update(ticketRef, {
        ...editedData,
        lastUpdated: new Date().toISOString()
      });
      setIsEditing(false);
    } catch (error) {
      console.error('Error updating ticket:', error);
    }
  };
  const handleQuickUpdate = async (field, value) => {
    try {
      const ticketRef = ref(database, `tickets/${ticket.id}`);
      const updates = {
        [field]: value,
        lastUpdated: new Date().toISOString()
      };

      if (field === 'status' && value === 'completed') {
        updates.completedAt = new Date().toISOString();
      }

      await update(ticketRef, updates);
      setEditedData(prev => ({ ...prev, ...updates }));
    } catch (error) {
      console.error('Error updating ticket:', error);
    }
  };
  return (
    <tr className="hover:bg-gray-50 cursor-pointer">
      <td className="px-4 py-2 text-sm">
        {typeof editedData.requester === 'object'
          ? `${editedData.requester.name || ''} ${editedData.requester.surname || ''}`
          : editedData.requester}
      </td>

      <td className="px-4 py-2 text-sm">
        {isEditing ? (
          <Input
            type="date"
            value={editedData.dueDate || ''}
            onChange={(e) => handleCellEdit('dueDate', e.target.value)}
            className="h-8"
          />
        ) : (
          editedData.dueDate || 'No due date'
        )}
      </td>

      <td className="px-4 py-2 text-sm font-mono">{editedData.ticketId}</td>

      <td className="px-4 py-2">
        <div className="cursor-pointer" onClick={(e) => e.stopPropagation()}>
          <Select
            value={editedData.status}
            onValueChange={(value) => handleQuickUpdate('status', value)}
          >
            <SelectTrigger className="border-none p-0 h-auto bg-transparent">
              <StatusBadge status={editedData.status} />
            </SelectTrigger>
            <SelectContent>
              {STATUS_OPTIONS.map((status) => (
                <SelectItem key={status.value} value={status.value}>
                  {status.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </td>

      <td className="px-4 py-2 text-sm">
        {isEditing ? (
          <Input
            value={editedData.subject}
            onChange={(e) => handleCellEdit('subject', e.target.value)}
            className="h-8"
          />
        ) : (
          editedData.subject
        )}
      </td>

      <td className="px-4 py-2 text-sm">
        {isEditing ? (
          <Input
            value={editedData.description}
            onChange={(e) => handleCellEdit('description', e.target.value)}
            className="h-8"
          />
        ) : (
          editedData.description
        )}
      </td>

      <td className="px-4 py-2">
        <div className="cursor-pointer" onClick={(e) => e.stopPropagation()}>
          <Select
            value={editedData.priority}
            onValueChange={(value) => handleQuickUpdate('priority', value)}
          >
            <SelectTrigger className="border-none p-0 h-auto bg-transparent">
              <PriorityBadge priority={editedData.priority} />
            </SelectTrigger>
            <SelectContent>
              {PRIORITY_OPTIONS.map((priority) => (
                <SelectItem key={priority.value} value={priority.value}>
                  {priority.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </td>
      <td className="px-4 py-2">
        <div className="cursor-pointer" onClick={(e) => e.stopPropagation()}>
          <Select
            value={editedData.assignedTo || "unassigned"}
            onValueChange={(value) =>
              handleQuickUpdate('assignedTo', value === 'unassigned' ? null : value)
            }
          >
            <SelectTrigger className="border-none p-0 h-auto bg-transparent">
              <div className="flex items-center gap-2">
                {editedData.assignedTo ? (
                  <Badge variant="outline">
                    {staffMembers.find(s => s.id === editedData.assignedTo)?.name || 'Unknown'}
                  </Badge>
                ) : (
                  <Badge variant="secondary">Unassigned</Badge>
                )}
              </div>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="unassigned">Unassigned</SelectItem>
              {staffMembers.map((staff) => (
                <SelectItem key={staff.id} value={staff.id}>
                  {staff.name} - {staff.department}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </td>

      <td className="px-4 py-2 text-sm">
        {editedData.completedAt ? (
          new Date(editedData.completedAt).toLocaleString('en-GB', {
            dateStyle: 'medium',
            timeStyle: 'short'
          })
        ) : (
          '-'
        )}
      </td>

      <td className="px-4 py-2">
        <div className="flex gap-1">
          <Button
            size="sm"
            variant="ghost"
            onClick={() => onTicketClick(ticket)}
          >
            <MessageSquare className="h-4 w-4" />
          </Button>
          {isEditing ? (
            <>
              <Button size="sm" variant="ghost" onClick={handleSave}>
                Save
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setIsEditing(false)}>
                Cancel
              </Button>
            </>
          ) : (
            <Button size="sm" variant="ghost" onClick={() => setIsEditing(true)}>
              <MoreVertical className="h-4 w-4" />
            </Button>
          )}
        </div>
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
  const [dateRange, setDateRange] = useState({
    from: new Date(new Date().setMonth(new Date().getMonth() - 1)),
    to: new Date()
  });
  const [isEditing, setIsEditing] = useState({
    subject: false,
    description: false
  });
  const [editedData, setEditedData] = useState({});

  useEffect(() => {
    if (selectedTicket) {
      setEditedData(selectedTicket);
    }
  }, [selectedTicket]);
  const handleUpdate = async (field, value) => {
    try {
      const ticketRef = ref(database, `tickets/${selectedTicket.id}`);
      await update(ticketRef, {
        [field]: value,
        lastUpdated: new Date().toISOString()
      });
      setIsEditing(prev => ({ ...prev, [field]: false }));
    } catch (error) {
      console.error('Error updating ticket:', error);
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
    const matchesStatus = filterStatus === 'open'
      ? ticket.status !== 'completed'
      : ticket.status === 'completed';

    const matchesSearch = searchQuery
      ? Object.values(ticket).some(value =>
        String(value).toLowerCase().includes(searchQuery.toLowerCase())
      )
      : true;

    const ticketDate = new Date(ticket.createdAt);
    const matchesDate = ticketDate >= dateRange.from && ticketDate <= dateRange.to;

    return matchesStatus && matchesSearch && matchesDate;
  });

  const handleTicketClick = (ticket) => {
    setSelectedTicket(ticket);
    setCommentModalOpen(true);
  };

  const handleClearFilters = () => {
    setSearchQuery('');
    setDateRange({
      from: new Date(new Date().setMonth(new Date().getMonth() - 1)),
      to: new Date()
    });
    setFilterStatus('open');
  };
  const handleQuickUpdate = async (ticketId, field, value) => {
    try {
      const ticketRef = ref(database, `tickets/${ticketId}`);
      await update(ticketRef, {
        [field]: value,
        lastUpdated: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error updating ticket:', error);
    }
  };

  return (
    <div className="p-6 mt-16"> {/* Added mt-16 to account for fixed header */}
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

          <div className="flex items-center gap-4">
            <DateRangePicker
              dateRange={dateRange}
              onUpdate={setDateRange}
            />

            <Input
              placeholder="Search..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="max-w-xs"
            />

            <Button
              variant="outline"
              className="flex items-center gap-2"
              onClick={handleClearFilters}
            >
              <AdminPanel></AdminPanel>
              <Filter className="h-4 w-4" />
              Clear Filters
            </Button>

          </div>
        </div>

        {/* Tickets Count */}
        <div className="flex items-center gap-2 mb-4">
          <h2 className="text-lg font-semibold">Tickets</h2>
          <Badge variant="secondary">{filteredTickets.length}</Badge>
        </div>

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

        <Dialog open={commentModalOpen} onOpenChange={setCommentModalOpen}>
          <DialogContent className="max-w-4xl min-h-[600px] bg-white text-gray-800 p-6">
            <DialogHeader>
              <DialogTitle>Ticket Details</DialogTitle>
              <DialogDescription>
                View and edit ticket information
              </DialogDescription>
            </DialogHeader>
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-4">
                <span className="text-xl font-semibold text-marist">{selectedTicket?.ticketId}</span>
                <div className="flex gap-2">
                  <Select
                    value={selectedTicket?.priority}
                    onValueChange={(value) => handleQuickUpdate(selectedTicket?.id, 'priority', value)}
                  >
                    <SelectTrigger className="border-none p-0 h-auto bg-transparent">
                      <Badge className={getPriorityStyle(selectedTicket?.priority)}>
                        {selectedTicket?.priority?.toUpperCase()}
                      </Badge>
                    </SelectTrigger>
                    <SelectContent>
                      {PRIORITY_OPTIONS.map((priority) => (
                        <SelectItem key={priority.value} value={priority.value}>
                          {priority.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <Select
                    value={selectedTicket?.status}
                    onValueChange={(value) => handleQuickUpdate(selectedTicket?.id, 'status', value)}
                  >
                    <SelectTrigger className="border-none p-0 h-auto bg-transparent">
                      <Badge variant="outline">{selectedTicket?.status}</Badge>
                    </SelectTrigger>
                    <SelectContent>
                      {STATUS_OPTIONS.map((status) => (
                        <SelectItem key={status.value} value={status.value}>
                          {status.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <DialogClose>
                <X className="h-5 w-5 text-gray-500 hover:text-gray-700" />
              </DialogClose>
            </div>

            <Tabs defaultValue="details" className="h-[calc(100%-4rem)]">
              <TabsList className="bg-[#1E3A6B] w-full flex space-x-2 p-1 rounded-lg mb-4">
                <TabsTrigger
                  value="details"
                  className="flex-1 py-2 text-white data-[state=active]:bg-[#12327A]"
                >
                  Details
                </TabsTrigger>
                <TabsTrigger
                  value="comments"
                  className="flex-1 py-2 text-white data-[state=active]:bg-[#12327A]"
                >
                  Comments
                </TabsTrigger>
                <TabsTrigger
                  value="files"
                  className="flex-1 py-2 text-white data-[state=active]:bg-[#12327A]"
                >
                  Files
                </TabsTrigger>
              </TabsList>

              <div className="h-[calc(100%-3rem)] overflow-y-auto custom-scrollbar">
                <TabsContent value="details" className="mt-0 space-y-4">
                  <div className="bg-gray-50 rounded-lg p-4">
                    <h3 className="text-lg font-semibold mb-4 text-marist">Ticket Information</h3>
                    <div className="space-y-4">
                      <div className="group relative">
                        <label className="text-sm text-gray-600">Subject</label>
                        {isEditing.subject ? (
                          <div className="flex gap-2 mt-1">
                            <Input
                              value={editedData.subject}
                              onChange={(e) => setEditedData(prev => ({ ...prev, subject: e.target.value }))}
                              className="flex-1"
                            />
                            <Button size="sm" onClick={() => handleUpdate('subject', editedData.subject)}>
                              <Save className="h-4 w-4" />
                            </Button>
                            <Button size="sm" variant="ghost" onClick={() => setIsEditing({ ...isEditing, subject: false })}>
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        ) : (
                          <div className="mt-1 relative">
                            <p className="text-lg">{selectedTicket?.subject}</p>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="absolute -right-2 -top-2 opacity-0 group-hover:opacity-100"
                              onClick={() => setIsEditing({ ...isEditing, subject: true })}
                            >
                              <Edit2 className="h-4 w-4" />
                            </Button>
                          </div>
                        )}
                      </div>

                      <div className="group relative">
                        <label className="text-sm text-gray-600">Description</label>
                        {isEditing.description ? (
                          <div className="flex gap-2 mt-1">
                            <Textarea
                              value={editedData.description}
                              onChange={(e) => setEditedData(prev => ({ ...prev, description: e.target.value }))}
                              className="flex-1"
                              rows={4}
                            />
                            <div className="flex flex-col gap-2">
                              <Button size="sm" onClick={() => handleUpdate('description', editedData.description)}>
                                <Save className="h-4 w-4" />
                              </Button>
                              <Button size="sm" variant="ghost" onClick={() => setIsEditing({ ...isEditing, description: false })}>
                                <X className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <div className="mt-1 relative">
                            <p className="whitespace-pre-wrap">{selectedTicket?.description}</p>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="absolute -right-2 -top-2 opacity-0 group-hover:opacity-100"
                              onClick={() => setIsEditing({ ...isEditing, description: true })}
                            >
                              <Edit2 className="h-4 w-4" />
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="bg-[#1E3A6B] rounded-lg p-4">
                    <h3 className="text-lg font-semibold mb-4">Assignment</h3>
                    <Select
                      value={selectedTicket?.assignedTo || "unassigned"}
                      onValueChange={(value) => handleQuickUpdate(selectedTicket?.id, 'assignedTo', value === 'unassigned' ? null : value)}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Assign to staff member..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="unassigned">Unassigned</SelectItem>
                        {staffMembers.map((staff) => (
                          <SelectItem key={staff.id} value={staff.id}>
                            {staff.name} - {staff.department}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </TabsContent>

                <TabsContent value="comments" className="mt-0">
                  <TicketComments ticketId={selectedTicket?.id} />
                </TabsContent>

                <TabsContent value="files" className="mt-0">
                  <FileUpload ticketId={selectedTicket?.id} />
                </TabsContent>
              </div>
            </Tabs>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
};

export default MaintenanceDashboard;