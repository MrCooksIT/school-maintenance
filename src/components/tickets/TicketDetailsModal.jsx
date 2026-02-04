// src/components/tickets/TicketDetailsModal.jsx
import { prepareTicketUpdate } from '@/components/utils/ticketStatusAutomation.js';
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
import AdminReopenHandler from './AdminReopenHandler';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Edit2, Save, X, MessageSquare, FileText, Calendar, Clock, MapPin, Paperclip, LockIcon } from 'lucide-react';
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

const TicketDetailsModal = ({ ticket, isOpen, onClose, staffMembers, userRole = '' }) => {
  const [editedData, setEditedData] = useState({});
  const [categories, setCategories] = useState([]);
  const [locations, setLocations] = useState([]);
  const [attachmentCount, setAttachmentCount] = useState(0);
  const { toast } = useToast();
  const [isPauseModalOpen, setIsPauseModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('details');
  const { user } = useAuth();

  // Determine if editing should be disabled (for completed tickets)
  const isCompleted = ticket && ticket.status === 'completed';

  // Determine if current user is an admin - made more permissive
  const isUserAdmin = (user, userRole) => {
    // Check multiple sources of admin status
    const isAdmin =
      // Check from AuthProvider
      userRole === 'admin' ||
      userRole === 'supervisor' ||
      userRole === 'estate_manager' ||
      // Check from user object
      user?.isAdmin === true ||
      user?.admin === true ||
      user?.role === 'admin' ||
      // Check from email patterns
      (user?.email && (
        user?.email.includes('@admin') ||
        user?.email.includes('estate') ||
        user?.email.includes('supervisor') ||
        user?.email.includes('acoetzee')
      )) ||
      // Check localStorage for debug override
      localStorage.getItem('debug_admin_override') === 'true';

    // Log the admin status check for debugging
    console.log('Admin status check:', {
      userRole,
      email: user?.email,
      result: isAdmin
    });

    return isAdmin;
  };

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
    if (!ticket || isCompleted) return; // Prevent updates if ticket is completed

    try {
      // Prepare the base update
      const baseUpdate = {
        [field]: value
      };

      // Use the automation utility to determine if status should change
      const updateData = prepareTicketUpdate(baseUpdate, ticket);

      // Update Firebase
      const ticketRef = ref(database, `tickets/${ticket.id}`);
      await update(ticketRef, updateData);

      // Update local state with all changes
      setEditedData(prev => ({ ...prev, ...updateData }));

      // Show appropriate success message
      let description = `The ticket ${field} has been updated.`;
      if (updateData.autoStatusUpdate && field === 'assignedTo') {
        description = `Ticket assigned and status automatically changed to "${updateData.status}".`;
      }

      toast({
        title: "Update Successful",
        description: description,
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
  // Add this function to your component
  const handleCloseTicket = async () => {
    if (isCompleted) return;

    // Ask for confirmation
    if (!window.confirm('Are you sure you want to close this ticket? This will mark it as completed.')) {
      return;
    }

    try {
      const ticketRef = ref(database, `tickets/${ticket.id}`);
      const now = new Date().toISOString();

      // Update the ticket status
      await update(ticketRef, {
        status: 'completed',
        completedAt: now,
        lastUpdated: now,
        // Flag to prevent duplicate notifications from Google Apps Script
        skipEmailNotification: false // Set to true if you want to handle notifications manually
      });

      // Add a system comment
      const commentsRef = ref(database, `tickets/${ticket.id}/comments`);
      await push(commentsRef, {
        content: "Ticket marked as completed",
        user: 'System',
        userEmail: 'system@maintenance.app',
        timestamp: now,
        isSystemComment: true
      });

      // Update local state
      setEditedData(prev => ({
        ...prev,
        status: 'completed',
        completedAt: now
      }));

      toast({
        title: "Ticket Closed",
        description: "The ticket has been marked as completed",
        variant: "success"
      });

      // Close the modal
      onClose();
    } catch (error) {
      console.error('Error closing ticket:', error);
      toast({
        title: "Error",
        description: "Failed to close the ticket: " + error.message,
        variant: "destructive"
      });
    }
  };
  const handleSaveChanges = async () => {
    if (isCompleted) {
      toast({
        title: "Cannot Edit Closed Ticket",
        description: "This ticket is closed and cannot be modified",
        variant: "destructive"
      });
      return;
    }

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

        // Close the modal after saving changes
        onClose();
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

      // Close the modal even if there are no changes
      onClose();
    }
  };

  // Updated function to request reopening a ticket instead of directly reopening it
  const handleRequestReopen = async () => {
    if (!isCompleted) return;

    try {
      const ticketRef = ref(database, `tickets/${ticket.id}`);
      await update(ticketRef, {
        reopenRequested: true,
        reopenRequestedAt: new Date().toISOString(),
        reopenRequestedBy: user?.uid || 'unknown-user',
        lastUpdated: new Date().toISOString()
      });

      // Add a system comment about the reopen request
      const commentsRef = ref(database, `tickets/${ticket.id}/comments`);
      await push(commentsRef, {
        content: "Ticket reopen requested - waiting for admin approval",
        user: 'System',
        userEmail: 'system@maintenance.app',
        timestamp: new Date().toISOString(),
        isSystemComment: true
      });

      setEditedData(prev => ({
        ...prev,
        reopenRequested: true,
        reopenRequestedAt: new Date().toISOString()
      }));

      toast({
        title: "Reopen Requested",
        description: "Your request to reopen this ticket has been submitted to administrators",
        variant: "success"
      });
    } catch (error) {
      console.error('Error requesting reopen:', error);
      toast({
        title: "Error",
        description: "Failed to request reopening: " + error.message,
        variant: "destructive"
      });
    }
  };

  // Admin function to approve reopening a ticket
  const handleApproveReopen = async () => {
    if (!isCompleted || !editedData.reopenRequested) return;

    // Check if user is admin using our helper function
    if (!isUserAdmin()) {
      toast({
        title: "Permission Denied",
        description: "Only administrators can approve reopening tickets",
        variant: "destructive"
      });
      return;
    }

    try {
      const ticketRef = ref(database, `tickets/${ticket.id}`);
      await update(ticketRef, {
        status: 'in-progress',
        completedAt: null,
        reopenRequested: false,
        reopenRequestedAt: null,
        reopenedAt: new Date().toISOString(),
        reopenedBy: user?.uid || 'admin-user',
        lastUpdated: new Date().toISOString(),
        // Flag to prevent duplicate notifications from Google Apps Script
        skipEmailNotification: true
      });

      // Add a system comment about the reopen approval
      const commentsRef = ref(database, `tickets/${ticket.id}/comments`);
      await push(commentsRef, {
        content: "Ticket reopening approved by administrator - ticket is now active again",
        user: 'System',
        userEmail: 'system@maintenance.app',
        timestamp: new Date().toISOString(),
        isSystemComment: true
      });

      setEditedData(prev => ({
        ...prev,
        status: 'in-progress',
        completedAt: null,
        reopenRequested: false,
        reopenRequestedAt: null,
        reopenedAt: new Date().toISOString(),
        skipEmailNotification: true
      }));

      toast({
        title: "Ticket Reopened",
        description: "The ticket has been successfully reopened",
        variant: "success"
      });

      // Close the modal after approving
      onClose();
    } catch (error) {
      console.error('Error approving reopen:', error);
      toast({
        title: "Error",
        description: "Failed to approve reopening",
        variant: "destructive"
      });
    }
  };

  // Direct reopen for admins (bypass the request process)
  const handleDirectReopen = async (ticket, user, toast, onClose) => {
    if (!ticket) return;

    try {
      console.log('Directly reopening ticket:', ticket.id);

      const ticketRef = ref(database, `tickets/${ticket.id}`);
      await update(ticketRef, {
        status: 'in-progress',
        completedAt: null,
        reopenedAt: new Date().toISOString(),
        reopenedBy: user?.uid || 'admin-user',
        lastUpdated: new Date().toISOString(),
        // Flag to prevent duplicate notifications
        skipEmailNotification: true
      });

      // Add a system comment
      const commentsRef = ref(database, `tickets/${ticket.id}/comments`);
      await push(commentsRef, {
        content: "Ticket directly reopened by administrator",
        user: 'System',
        userEmail: 'system@maintenance.app',
        timestamp: new Date().toISOString(),
        isSystemComment: true
      });

      toast({
        title: "Ticket Reopened",
        description: "The ticket has been successfully reopened",
        variant: "success"
      });

      // Close the modal if provided
      if (onClose) {
        onClose();
      }
    } catch (error) {
      console.error('Error reopening ticket:', error);

      toast({
        title: "Reopening Failed",
        description: "There was an error reopening the ticket. Please try again.",
        variant: "destructive"
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
        aria-describedby="ticket-details-description"
      >
        <DialogHeader className="sr-only">
          <DialogTitle>Ticket Details: {ticket.ticketId}</DialogTitle>
          <DialogDescription id="ticket-details-description">
            View and manage details, comments, and files for ticket {ticket.ticketId}
          </DialogDescription>
        </DialogHeader>

        {/* Header Section */}
        <div className="p-4 border-b bg-[#0a1e46] text-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <span className="text-2xl font-bold">{ticket.ticketId}</span>
              <div className="flex items-center gap-2">
                {isCompleted ? (
                  // Show static badge for completed tickets
                  <div className={`px-3 py-1 rounded-full text-xs font-medium ${getPriorityStyle(editedData.priority)}`}>
                    {editedData.priority?.toUpperCase()}
                  </div>
                ) : (
                  // Allow editing for non-completed tickets
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
                )}

                {isCompleted ? (
                  // Show static badge for completed tickets
                  <div className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusStyle(editedData.status)}`}>
                    {editedData.status === 'in-progress' ? 'IN PROGRESS' : editedData.status?.toUpperCase()}
                  </div>
                ) : (
                  // Allow editing for non-completed tickets
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
                )}
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
            {isCompleted && (
              <div className="flex items-center gap-1 ml-auto">
                <LockIcon className="h-4 w-4 text-yellow-300" />
                <span className="text-yellow-300">
                  {editedData.reopenRequested
                    ? "Reopen Requested"
                    : "Ticket Closed"}
                </span>
              </div>
            )}
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
            <TabsContent value="details" className="p-6 h-full" forceMount={activeTab === 'details'}>
              {isCompleted && (
                <div className={`mb-6 p-4 ${editedData.reopenRequested ? 'bg-blue-50 border-blue-200' : 'bg-yellow-50 border-yellow-200'} border rounded-lg flex items-center gap-3`}>
                  <LockIcon className={`h-5 w-5 ${editedData.reopenRequested ? 'text-blue-600' : 'text-yellow-600'} flex-shrink-0`} />
                  <div>
                    <h3 className={`font-medium ${editedData.reopenRequested ? 'text-blue-800' : 'text-yellow-800'}`}>
                      {editedData.reopenRequested ? 'Reopen request pending' : 'This ticket is closed'}
                    </h3>
                    <p className={`text-sm ${editedData.reopenRequested ? 'text-blue-700' : 'text-yellow-700'}`}>
                      {editedData.reopenRequested
                        ? 'An administrator must approve this ticket to be reopened'
                        : 'Closed tickets are read-only and cannot be modified'}
                    </p>
                    {editedData.reopenRequestedAt && (
                      <p className="text-sm text-blue-700 mt-1">
                        Requested: {format(new Date(editedData.reopenRequestedAt), 'dd/MM/yyyy HH:mm')}
                      </p>
                    )}
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Left column */}
                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-gray-700">Subject</label>
                    <Input
                      value={editedData.subject || ''}
                      onChange={(e) => !isCompleted && setEditedData(prev => ({ ...prev, subject: e.target.value }))}
                      onBlur={() => !isCompleted && editedData.subject !== ticket.subject && handleQuickUpdate('subject', editedData.subject)}
                      className={`border-gray-300 ${isCompleted ? 'bg-gray-100 cursor-not-allowed' : ''}`}
                      disabled={isCompleted}
                      readOnly={isCompleted}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-gray-700">Description</label>
                    <Textarea
                      value={editedData.description || ''}
                      onChange={(e) => !isCompleted && setEditedData(prev => ({ ...prev, description: e.target.value }))}
                      onBlur={() => !isCompleted && editedData.description !== ticket.description && handleQuickUpdate('description', editedData.description)}
                      className={`border-gray-300 min-h-[150px] ${isCompleted ? 'bg-gray-100 cursor-not-allowed' : ''}`}
                      disabled={isCompleted}
                      readOnly={isCompleted}
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-gray-700">Location</label>
                    {isCompleted ? (
                      <Input
                        value={getLocationName(editedData.location) || "None"}
                        className="bg-gray-100 cursor-not-allowed"
                        disabled
                        readOnly
                      />
                    ) : (
                      <Select
                        value={editedData.location || 'none'}
                        onValueChange={(value) => handleQuickUpdate('location', value === 'none' ? null : value)}
                        disabled={isCompleted}
                      >
                        <SelectTrigger className="border-gray-300">
                          <SelectValue placeholder="Select location">
                            {getLocationName(editedData.location) || "Select location"}
                          </SelectValue>
                        </SelectTrigger>
                        <SelectContent
                          style={{
                            maxHeight: '300px',
                            overflowY: 'auto'
                          }}
                          className="max-h-[300px] overflow-y-auto scroll-auto"
                          sideOffset={4}
                          position="popper"
                          avoidCollisions={true}
                        >
                          <SelectItem value="none">None</SelectItem>
                          {locations.map((location) => (
                            <SelectItem key={location.id} value={location.id}>
                              {location.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
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
                        {isCompleted ? (
                          <span className="text-sm font-medium">
                            {editedData.dueDate ? format(new Date(editedData.dueDate), 'dd/MM/yyyy') : 'None'}
                          </span>
                        ) : (
                          <Input
                            type="date"
                            value={editedData.dueDate || ''}
                            onChange={(e) => setEditedData(prev => ({ ...prev, dueDate: e.target.value }))}
                            onBlur={() => editedData.dueDate !== ticket.dueDate && handleQuickUpdate('dueDate', editedData.dueDate)}
                            className="w-36 h-8 border-gray-300"
                          />
                        )}
                      </div>

                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-600">Category:</span>
                        {isCompleted ? (
                          <span className="text-sm font-medium">
                            {getCategoryName(editedData.category) || "None"}
                          </span>
                        ) : (
                          <Select
                            value={editedData.category || 'none'}
                            onValueChange={(value) => handleQuickUpdate('category', value === 'none' ? null : value)}
                            disabled={isCompleted}
                          >
                            <SelectTrigger className="w-36 h-8 border-gray-300">
                              <SelectValue placeholder="Select category">
                                {getCategoryName(editedData.category) || "Select category"}
                              </SelectValue>
                            </SelectTrigger>
                            <SelectContent
                              style={{
                                maxHeight: '300px',
                                overflowY: 'auto'
                              }}
                              className="max-h-[300px] overflow-y-auto scroll-auto"
                              sideOffset={4}
                              position="popper"
                              avoidCollisions={true}
                            >
                              <SelectItem value="none">None</SelectItem>
                              {categories.map((category) => (
                                <SelectItem key={category.id} value={category.id}>
                                  {category.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        )}
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
                    {isCompleted ? (
                      <div className="bg-white p-2 rounded text-center">
                        <span>
                          {editedData.assignedTo
                            ? staffMembers?.find(s => s.id === editedData.assignedTo)?.name || 'Unknown Staff Member'
                            : 'Unassigned'}
                        </span>
                      </div>
                    ) : (
                      <Select
                        value={editedData.assignedTo || "unassigned"}
                        onValueChange={(value) => handleQuickUpdate('assignedTo', value === 'unassigned' ? null : value)}
                        disabled={isCompleted}
                      >
                        <SelectTrigger className="bg-white">
                          <SelectValue placeholder="Assign to staff member" />
                        </SelectTrigger>
                        <SelectContent
                          style={{
                            maxHeight: '300px',
                            overflowY: 'auto'
                          }}
                          className="max-h-[300px] overflow-y-auto scroll-auto"
                          sideOffset={4}
                          position="popper"
                          avoidCollisions={true}
                        >
                          <SelectItem value="unassigned">Unassigned</SelectItem>
                          {staffMembers?.map((staff) => (
                            <SelectItem key={staff.id} value={staff.id}>
                              {staff.name} - {staff.department}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
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

                  {/* Action Buttons */}
                  <div className="pt-4 flex gap-2">
                    {isCompleted ? (
                      // For completed tickets, show appropriate button based on reopen request status
                      editedData.reopenRequested ? (
                        <>
                          {/* Show pending message if reopen already requested */}
                          <div className="flex-1 bg-yellow-100 text-yellow-800 border border-yellow-200 rounded-md p-2 text-center text-sm">
                            Reopen request pending admin approval
                          </div>

                          {/* Admin can still approve even with the banner showing */}
                          {isUserAdmin() && (
                            <Button
                              onClick={handleApproveReopen}
                              className="flex-shrink-0 bg-green-600 hover:bg-green-700 text-white"
                            >
                              Approve & Reopen
                            </Button>
                          )}
                        </>
                      ) : (
                        <>
                          {/* Regular users just see request button */}
                          <Button
                            onClick={handleRequestReopen}
                            className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
                          >
                            Request to Reopen
                          </Button>

                          {/* Admins see both options */}
                          {isUserAdmin() && (
                            <Button
                              onClick={handleDirectReopen}
                              className="flex-1 bg-green-600 hover:bg-green-700 text-white"
                            >
                              Directly Reopen (Admin)
                            </Button>
                          )}
                        </>
                      )
                    ) : (
                      // For active tickets, show normal action buttons
                      <>
                        <Button
                          onClick={handleSaveChanges}
                          className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
                        >
                          Save Changes
                        </Button>

                        {editedData.status !== 'completed' && (
                          <>
                            {editedData.status === 'paused' ? (
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

                                  // Close the modal after resuming
                                  onClose();
                                }}
                                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
                              >
                                Resume Ticket
                              </Button>
                            ) : (
                              // Two buttons side by side: Pause and Close
                              <>
                                <Button
                                  onClick={() => setIsPauseModalOpen(true)}
                                  className="flex-1 bg-purple-600 hover:bg-purple-700 text-white"
                                >
                                  Pause Ticket
                                </Button>

                                <Button
                                  onClick={handleCloseTicket}
                                  className="flex-1 bg-green-600 hover:bg-green-700 text-white"
                                >
                                  Close Ticket
                                </Button>
                              </>
                            )}
                          </>
                        )}
                      </>
                    )}
                  </div>
                </div>
              </div>
            </TabsContent>

            {/* Comments Tab - Always available for all tickets */}
            <TabsContent value="comments" className="h-full" forceMount={activeTab === 'comments'}>
              <TicketComments ticketId={ticket.id} />
            </TabsContent>

            {/* Files Tab - Always available for all tickets */}
            <TabsContent value="files" className="h-full p-4" forceMount={activeTab === 'files'}>
              <FileAttachments ticketId={ticket.id} />
            </TabsContent>
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
              NotificationService.sendPauseNotification(
                ticket,
                pauseData,
                user?.uid || 'unknown-user'
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

            // Close the modal after pausing
            onClose();
          }}
        />
      </DialogContent>
    </Dialog>
  );
};

export default TicketDetailsModal;