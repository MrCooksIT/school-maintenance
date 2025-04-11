// src/components/tickets/TicketDetailsModal.jsx
import React, { useState, useEffect } from 'react';
import PauseReasonModal from './PauseReasonModal';
import { ref, update, onValue, push } from 'firebase/database';
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
import { Edit2, Save, X, MessageSquare, FileText, Calendar, Clock, MapPin, Paperclip } from 'lucide-react';
import { TicketComments } from './TicketComments';
import { FileAttachments } from './FileAttachments';
import { useToast } from "@/components/ui/use-toast";
import { format } from 'date-fns';
import NotificationService from '../services/notificationService';
import { useAuth } from '@/components/auth/AuthProvider';

const STATUS_OPTIONS = [
  { value: 'new', label: 'New' },
  { value: 'in-progress', label: 'In Progress' },
  { value: 'paused', label: 'Paused' },
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
    "paused": "bg-purple-100 text-purple-800 border-purple-200",
    completed: "bg-green-100 text-green-800 border-green-200",
    overdue: "bg-red-100 text-red-800 border-red-200"
  };
  return styles[status] || styles.new;
};

const TicketDetailsModal = ({ ticket, isOpen, onClose, staffMembers }) => {
  const [editedData, setEditedData] = useState({});
  const [categories, setCategories] = useState([]);
  const [locations, setLocations] = useState([]);
  const [attachmentCount, setAttachmentCount] = useState(0);
  const { toast } = useToast();
  const [isPauseModalOpen, setIsPauseModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('details');
  const { user } = useAuth();
  // Create unique IDs for accessibility
  const dialogDescriptionId = "ticket-details-description";

  useEffect(() => {
    if (ticket) {
      setEditedData(ticket);
    }
  }, [ticket]);

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

  // Get attachment count
  useEffect(() => {
    if (!ticket) return;

    // Count regular attachments
    const attachmentsRef = ref(database, `tickets/${ticket.id}/attachments`);
    const emailAttachmentsRef = ref(database, `tickets/${ticket.id}/emailAttachments`);

    const attachmentsUnsubscribe = onValue(attachmentsRef, (snapshot) => {
      const regularCount = snapshot.exists() ? Object.keys(snapshot.val()).length : 0;

      // Now check email attachments
      const emailUnsubscribe = onValue(emailAttachmentsRef, (snapshot) => {
        const emailCount = snapshot.exists() ? Object.keys(snapshot.val()).length : 0;
        setAttachmentCount(regularCount + emailCount);
      });

      return emailUnsubscribe;
    });

    return () => attachmentsUnsubscribe();
  }, [ticket]);

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

  const handleSaveChanges = async () => {
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
  };

  if (!ticket) {
    return null;
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent
        className="w-full max-w-[90vw] md:max-w-4xl lg:max-w-5xl p-0 max-h-[90vh] overflow-hidden flex flex-col"
        aria-describedby={dialogDescriptionId}
      >
        <DialogHeader className="p-4 bg-white">
          <DialogTitle>Ticket Details: {ticket.ticketId}</DialogTitle>
          <DialogDescription id={dialogDescriptionId}>
            View and manage details, comments, and files for ticket {ticket.ticketId}
          </DialogDescription>
        </DialogHeader>

        {/* Header Section */}
        <div className="p-4 border-b bg-[#0a1e46] text-white">
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
              Created: {format(new Date(ticket.createdAt), 'dd/MM/yyyy')}
            </div>
            {ticket.lastUpdated && (
              <div className="flex items-center gap-1">
                <Clock className="h-4 w-4" />
                Updated: {format(new Date(ticket.lastUpdated), 'dd/MM/yyyy')}
              </div>
            )}
            <div className="flex items-center gap-1">
              <Paperclip className="h-4 w-4" />
              Files: {attachmentCount}
            </div>
          </div>
        </div>

        {/* Main Content Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 overflow-hidden flex flex-col">
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
                Files {attachmentCount > 0 && `(${attachmentCount})`}
              </TabsTrigger>
            </TabsList>
          </div>

          <div className="flex-1 overflow-auto">
            {/* Details Tab */}
            {activeTab === 'details' && (
              <div className="p-6 h-full">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Left column */}
                  <div className="space-y-4">
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
                  <div className="space-y-4">
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

                        <div className="flex justify-between items-center">
                          <span className="text-sm text-gray-600">Due Date:</span>
                          <Input
                            type="date"
                            value={editedData.dueDate || ''}
                            onChange={(e) => setEditedData(prev => ({ ...prev, dueDate: e.target.value }))}
                            onBlur={() => editedData.dueDate !== ticket.dueDate && handleQuickUpdate('dueDate', editedData.dueDate)}
                            className="w-36 h-8 border-gray-300"
                          />
                        </div>

                        <div className="flex justify-between items-center">
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
                              {format(new Date(editedData.completedAt), 'dd/MM/yyyy')}
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

                    {/* File Summary Panel */}
                    <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                      <h3 className="text-base font-medium text-gray-800 mb-3 flex items-center">
                        <FileText className="h-4 w-4 mr-2" />
                        Attached Files
                      </h3>
                      <div className="text-sm">
                        {attachmentCount > 0 ? (
                          <button
                            className="text-blue-600 hover:underline flex items-center"
                            onClick={() => setActiveTab('files')}
                          >
                            <span>View all {attachmentCount} files</span>
                          </button>
                        ) : (
                          <span className="text-gray-500">No files attached</span>
                        )}
                      </div>
                    </div>

                    <div className="pt-4 flex gap-2">
                      <Button
                        onClick={handleSaveChanges}
                        className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
                      >
                        Save Changes
                      </Button>

                      {editedData.status !== 'completed' && (
                        editedData.status === 'paused' ? (
                          <Button
                            onClick={() => {
                              handleQuickUpdate('status', 'in-progress');
                              handleQuickUpdate('pausedAt', null);
                              handleQuickUpdate('pauseReason', null);

                              // Add a system comment for resuming
                              const commentsRef = ref(database, `tickets/${ticket.id}/comments`);
                              push(commentsRef, {
                                content: "Ticket resumed from pause status",
                                user: 'System',
                                userEmail: 'system@maintenance.app',
                                timestamp: new Date().toISOString(),
                                isSystemComment: true
                              });

                              toast({
                                title: "Ticket Resumed",
                                description: "The ticket is now back in progress",
                                variant: "info"
                              });
                            }}
                            className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
                          >
                            Resume Ticket
                          </Button>
                        ) : (
                          // Pause button
                          <Button
                            onClick={() => setIsPauseModalOpen(true)}
                            className="flex-1 bg-purple-600 hover:bg-purple-700 text-white"
                          >
                            Pause Ticket
                          </Button>
                        )
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Comments Tab */}
            {activeTab === 'comments' && (
              <div className="h-full">
                <TicketComments ticketId={ticket.id} />
              </div>
            )}

            {/* Files Tab */}
            {activeTab === 'files' && (
              <div className="h-full p-4">
                <FileAttachments ticketId={ticket.id} />
              </div>
            )}
          </div>
        </Tabs>

        {/* Pause Reason Modal */}
        <PauseReasonModal
          open={isPauseModalOpen}
          onOpenChange={setIsPauseModalOpen}
          onPause={(pauseData) => {
            // Set status to paused
            handleQuickUpdate('status', 'paused');
            handleQuickUpdate('pausedAt', new Date().toISOString());
            handleQuickUpdate('pauseReason', pauseData.reason);
            handleQuickUpdate('pauseData', pauseData);

            // Add a comment about the pause
            const commentsRef = ref(database, `tickets/${ticket.id}/comments`);
            push(commentsRef, {
              content: `Ticket paused: ${pauseData.reason}${pauseData.estimatedDuration ? ` - Estimated duration: ${pauseData.estimatedDuration.replace('_', ' ')}` : ''}`,
              user: 'System',
              userEmail: 'system@maintenance.app',
              timestamp: new Date().toISOString(),
              isSystemComment: true
            });

            // Send notifications to supervisor/estate manager if needed
            if (pauseData.notifySupervisor || pauseData.category === 'procurement') {
              NotificationService.sendSimplePauseNotification(
                ticket,
                pauseData.reason,
                pauseData.category
              ).then(success => {
                if (success) {
                  toast({
                    title: "Notifications Sent",
                    description: `Supervisor${pauseData.category === 'procurement' ? ' and Estate Manager' : ''} have been notified`,
                    variant: "info"
                  });
                }
              });
            }

            toast({
              title: "Ticket Paused",
              description: "The ticket has been put on hold",
              variant: "info"
            });
          }}
        />
      </DialogContent>
    </Dialog>
  );
};

export default TicketDetailsModal;