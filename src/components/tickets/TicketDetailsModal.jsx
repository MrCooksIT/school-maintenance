// src/components/tickets/TicketDetailsModal.jsx
import React, { useState, useEffect } from 'react';
import { ref, update, onValue } from 'firebase/database';
import { database } from '@/config/firebase';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Edit2, Save, X, MessageSquare, FileText, Calendar, Clock, MapPin } from 'lucide-react';
import { TicketComments } from './TicketComments';
import { FileUpload } from './FileUpload';
import { useToast } from "@/components/ui/use-toast";

const STATUS_OPTIONS = [
  { value: 'new', label: 'New' },
  { value: 'in-progress', label: 'In Progress' },
  { value: 'completed', label: 'Completed' },
  { value: 'overdue', label: 'Overdue' }
];

const PRIORITY_OPTIONS = [
  { value: 'high', label: 'High' },
  { value: 'medium', label: 'Medium' },
  { value: 'low', label: 'Low' }
];

const getPriorityStyle = (priority) => {
  const styles = {
    high: "bg-red-100 text-red-800 border-red-200",
    medium: "bg-yellow-100 text-yellow-800 border-yellow-200",
    low: "bg-green-100 text-green-800 border-green-200"
  };
  return styles[priority] || styles.medium;
};

const getStatusStyle = (status) => {
  const styles = {
    new: "bg-blue-100 text-blue-800 border-blue-200",
    "in-progress": "bg-yellow-100 text-yellow-800 border-yellow-200",
    completed: "bg-green-100 text-green-800 border-green-200",
    overdue: "bg-red-100 text-red-800 border-red-200"
  };
  return styles[status] || styles.new;
};

const TicketDetailsModal = ({ ticket, isOpen, onClose, staffMembers }) => {
  // All hooks must be called at the top level and unconditionally
  const [editedData, setEditedData] = useState({});
  const [categories, setCategories] = useState([]);
  const [locations, setLocations] = useState([]);
  const { toast } = useToast();

  // Update editedData when ticket changes
  useEffect(() => {
    if (ticket) {
      setEditedData(ticket);
    }
  }, [ticket]);

  // Load categories - always called unconditionally
  useEffect(() => {
    const categoriesRef = ref(database, 'categories');
    const unsubscribe = onValue(categoriesRef, (snapshot) => {
      if (snapshot.exists()) {
        const categoriesData = Object.entries(snapshot.val()).map(([id, data]) => ({
          id,
          ...data,
        }));
        setCategories(categoriesData);
      } else {
        setCategories([]);
      }
    });

    return () => unsubscribe();
  }, []);

  // Load locations - always called unconditionally
  useEffect(() => {
    const locationsRef = ref(database, 'locations');
    const unsubscribe = onValue(locationsRef, (snapshot) => {
      if (snapshot.exists()) {
        const locationsData = Object.entries(snapshot.val()).map(([id, data]) => ({
          id,
          ...data,
        }));
        setLocations(locationsData);
      } else {
        setLocations([]);
      }
    });

    return () => unsubscribe();
  }, []);

  // Utility functions (not hooks)
  const getCategoryName = (categoryId) => {
    if (!categoryId || categoryId === 'none') return '';
    const category = categories.find(cat => cat.id === categoryId);
    return category ? category.name : categoryId;
  };

  const getLocationName = (locationId) => {
    if (!locationId || locationId === 'none') return '';
    const location = locations.find(loc => loc.id === locationId);
    return location ? location.name : locationId;
  };

  const handleQuickUpdate = async (field, value) => {
    if (!ticket) return;

    try {
      const ticketRef = ref(database, `tickets/${ticket.id}`);
      await update(ticketRef, {
        [field]: value,
        lastUpdated: new Date().toISOString()
      });
      setEditedData(prev => ({ ...prev, [field]: value }));

      toast({
        title: "Update Successful",
        description: `The ticket ${field} has been updated.`,
        variant: "success"
      });
    } catch (error) {
      console.error('Error updating ticket:', error);
      toast({
        title: "Update Failed",
        description: `There was an error updating the ticket.`,
        variant: "destructive"
      });
    }
  };

  // Early render check - but must be AFTER all hooks!
  if (!ticket) {
    return null;
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent
        className="w-full max-w-[90vw] md:max-w-4xl lg:max-w-5xl p-0 max-h-[90vh] overflow-hidden flex flex-col"
        aria-describedby="ticket-details-description"
      >
        {/* Hidden but accessible title and description for screen readers */}
        <DialogHeader className="sr-only">
          <DialogTitle>Ticket Details: {ticket.ticketId}</DialogTitle>
          <DialogDescription id="ticket-details-description">
            View and manage details, comments, and files for ticket {ticket.ticketId}
          </DialogDescription>
        </DialogHeader>

        {/* Header with ticket info and status badges */}
        <div className="p-6 border-b bg-[#0a1e46] text-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <span className="text-2xl font-bold">{ticket.ticketId}</span>
              <div className="flex items-center gap-2">
                <Select
                  value={editedData.priority}
                  onValueChange={(value) => handleQuickUpdate('priority', value)}
                >
                  <SelectTrigger className="border-0 bg-transparent p-0 h-8 w-auto">
                    <div className={`px-3 py-1 rounded-full text-xs font-medium ${getPriorityStyle(editedData.priority)}`}>
                      {editedData.priority?.toUpperCase()}
                    </div>
                  </SelectTrigger>
                  <SelectContent>
                    {PRIORITY_OPTIONS.map((priority) => (
                      <SelectItem key={priority.value} value={priority.value}>
                        <div className={`px-2 py-1 rounded-full text-xs font-medium ${getPriorityStyle(priority.value)}`}>
                          {priority.label.toUpperCase()}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select
                  value={editedData.status}
                  onValueChange={(value) => handleQuickUpdate('status', value)}
                >
                  <SelectTrigger className="border-0 bg-transparent p-0 h-8 w-auto">
                    <div className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusStyle(editedData.status)}`}>
                      {editedData.status === 'in-progress' ? 'IN PROGRESS' : editedData.status?.toUpperCase()}
                    </div>
                  </SelectTrigger>
                  <SelectContent>
                    {STATUS_OPTIONS.map((status) => (
                      <SelectItem key={status.value} value={status.value}>
                        <div className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusStyle(status.value)}`}>
                          {status.label.toUpperCase()}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="text-white hover:bg-blue-900/50 rounded-full"
            >
              <X className="h-5 w-5" />
            </Button>
          </div>
          <div className="text-sm text-gray-300 mt-2 flex items-center gap-4">
            <div className="flex items-center gap-1">
              <Calendar className="h-4 w-4" />
              Created: {new Date(ticket.createdAt).toLocaleDateString('en-ZA', {
                year: 'numeric',
                month: 'short',
                day: 'numeric'
              })}
            </div>
            {ticket.lastUpdated && (
              <div className="flex items-center gap-1">
                <Clock className="h-4 w-4" />
                Updated: {new Date(ticket.lastUpdated).toLocaleDateString('en-ZA', {
                  year: 'numeric',
                  month: 'short',
                  day: 'numeric'
                })}
              </div>
            )}
          </div>
        </div>

        {/* Tabs and content area */}
        <Tabs defaultValue="details" className="flex-1 overflow-hidden flex flex-col">
          <div className="border-b bg-gray-100">
            <TabsList className="w-full rounded-none border-0 bg-transparent h-12">
              <TabsTrigger
                value="details"
                className="flex-1 rounded-none border-b-2 border-transparent data-[state=active]:border-[#0a1e46] data-[state=active]:text-[#0a1e46] text-gray-600 h-12"
              >
                Details
              </TabsTrigger>
              <TabsTrigger
                value="comments"
                className="flex-1 rounded-none border-b-2 border-transparent data-[state=active]:border-[#0a1e46] data-[state=active]:text-[#0a1e46] text-gray-600 h-12"
              >
                Comments
              </TabsTrigger>
              <TabsTrigger
                value="files"
                className="flex-1 rounded-none border-b-2 border-transparent data-[state=active]:border-[#0a1e46] data-[state=active]:text-[#0a1e46] text-gray-600 h-12"
              >
                Files
              </TabsTrigger>
            </TabsList>
          </div>

          <div className="flex-1 overflow-auto">
            <TabsContent value="details" className="p-6 h-full">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Left column */}
                <div className="space-y-6">
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-gray-700">Subject</label>
                    <Input
                      value={editedData.subject || ''}
                      onChange={(e) => setEditedData(prev => ({ ...prev, subject: e.target.value }))}
                      onBlur={() => editedData.subject !== ticket.subject && handleQuickUpdate('subject', editedData.subject)}
                      className="border-gray-300"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-gray-700">Description</label>
                    <Textarea
                      value={editedData.description || ''}
                      onChange={(e) => setEditedData(prev => ({ ...prev, description: e.target.value }))}
                      onBlur={() => editedData.description !== ticket.description && handleQuickUpdate('description', editedData.description)}
                      className="border-gray-300 min-h-[150px]"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-gray-700">Location</label>
                    <Select
                      value={editedData.location || 'none'}
                      onValueChange={(value) => handleQuickUpdate('location', value === 'none' ? null : value)}
                    >
                      <SelectTrigger className="border-gray-300">
                        <SelectValue placeholder="Select location">
                          {getLocationName(editedData.location) || "Select location"}
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">None</SelectItem>
                        {locations.map((location) => (
                          <SelectItem key={location.id} value={location.id}>
                            {location.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Right column */}
                <div className="space-y-6">
                  <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                    <h3 className="text-base font-medium text-gray-800 mb-3">Ticket Information</h3>

                    <div className="space-y-4">
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Reported By:</span>
                        <span className="text-sm font-medium">
                          {typeof editedData.requester === 'object'
                            ? `${editedData.requester.name || ''} ${editedData.requester.surname || ''}`
                            : editedData.requester}
                        </span>
                      </div>

                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Due Date:</span>
                        <Input
                          type="date"
                          value={editedData.dueDate || ''}
                          onChange={(e) => setEditedData(prev => ({ ...prev, dueDate: e.target.value }))}
                          onBlur={() => editedData.dueDate !== ticket.dueDate && handleQuickUpdate('dueDate', editedData.dueDate)}
                          className="w-36 h-8 border-gray-300"
                        />
                      </div>

                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Category:</span>
                        <Select
                          value={editedData.category || 'none'}
                          onValueChange={(value) => handleQuickUpdate('category', value === 'none' ? null : value)}
                        >
                          <SelectTrigger className="w-36 h-8 border-gray-300">
                            <SelectValue placeholder="Select category">
                              {getCategoryName(editedData.category) || "Select category"}
                            </SelectValue>
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">None</SelectItem>
                            {categories.map((category) => (
                              <SelectItem key={category.id} value={category.id}>
                                {category.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      {editedData.completedAt && (
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-600">Completed On:</span>
                          <span className="text-sm font-medium">
                            {new Date(editedData.completedAt).toLocaleDateString('en-ZA', {
                              year: 'numeric',
                              month: 'short',
                              day: 'numeric'
                            })}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="bg-[#0a1e46] p-4 rounded-lg">
                    <h3 className="text-base font-medium text-white mb-3">Assignment</h3>
                    <Select
                      value={editedData.assignedTo || "unassigned"}
                      onValueChange={(value) => handleQuickUpdate('assignedTo', value === 'unassigned' ? null : value)}
                    >
                      <SelectTrigger className="bg-white">
                        <SelectValue placeholder="Assign to staff member" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="unassigned">Unassigned</SelectItem>
                        {staffMembers?.map((staff) => (
                          <SelectItem key={staff.id} value={staff.id}>
                            {staff.name} - {staff.department}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="pt-4 flex gap-2">
                    <Button
                      onClick={() => {
                        // Save all pending changes (if any)
                        const hasChanges = Object.entries(editedData).some(([key, value]) => {
                          return ticket[key] !== value && key !== 'lastUpdated';
                        });

                        if (hasChanges) {
                          const updates = { ...editedData, lastUpdated: new Date().toISOString() };
                          const ticketRef = ref(database, `tickets/${ticket.id}`);
                          update(ticketRef, updates).then(() => {
                            toast({
                              title: "Changes Saved",
                              description: "All changes have been saved successfully",
                              variant: "success"
                            });
                          }).catch(error => {
                            toast({
                              title: "Error",
                              description: "Failed to save changes",
                              variant: "destructive"
                            });
                            console.error('Error saving changes:', error);
                          });
                        } else {
                          toast({
                            title: "No Changes",
                            description: "No changes to save",
                            variant: "info"
                          });
                        }
                      }}
                      className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
                    >
                      Save Changes
                    </Button>

                    {editedData.status !== 'completed' && (
                      <Button
                        onClick={() => {
                          handleQuickUpdate('status', 'completed');
                          handleQuickUpdate('completedAt', new Date().toISOString());
                        }}
                        className="flex-1 bg-green-600 hover:bg-green-700 text-white"
                      >
                        Mark as Completed
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="comments" className="p-0 h-[500px] flex flex-col">
              <TicketComments ticketId={ticket.id} />
            </TabsContent>

            <TabsContent value="files" className="p-0 h-[500px] flex flex-col">
              <FileUpload ticketId={ticket.id} />
            </TabsContent>
          </div>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};

export default TicketDetailsModal;