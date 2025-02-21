// src/components/tickets/TicketDetailsModal.jsx
import React, { useState, useEffect } from 'react';
import { ref, update } from 'firebase/database';
import { database } from '@/config/firebase';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Edit2, Save, X, MessageSquare, FileText } from 'lucide-react';
import { TicketComments } from './TicketComments';
import { FileUpload } from './FileUpload';

const STATUS_OPTIONS = [
  { value: 'new', label: 'New' },
  { value: 'in-progress', label: 'In Progress' },
  { value: 'completed', label: 'Completed' }
];

const PRIORITY_OPTIONS = [
  { value: 'high', label: 'High' },
  { value: 'medium', label: 'Medium' },
  { value: 'low', label: 'Low' }
];

const getPriorityStyle = (priority) => {
  const styles = {
    high: "bg-red-900/50 text-red-200 border-red-800",
    medium: "bg-yellow-900/50 text-yellow-200 border-yellow-800",
    low: "bg-green-900/50 text-green-200 border-green-800"
  };
  return styles[priority] || styles.medium;
};

const TicketDetailsModal = ({ ticket, isOpen, onClose, staffMembers }) => {
  const [editedData, setEditedData] = useState(ticket || {});

  useEffect(() => {
    if (ticket) {
      setEditedData(ticket);
    }
  }, [ticket]);

  const handleQuickUpdate = async (field, value) => {
    try {
      const ticketRef = ref(database, `tickets/${ticket.id}`);
      await update(ticketRef, {
        [field]: value,
        lastUpdated: new Date().toISOString()
      });
      setEditedData(prev => ({ ...prev, [field]: value }));
    } catch (error) {
      console.error('Error updating ticket:', error);
    }
  };

  if (!ticket) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="w-full max-w-[90vw] md:max-w-4xl lg:max-w-5xl p-4 md:p-6 bg-white">
        <DialogHeader className="border-b bg-[#1E3A6B] text-white">
          <div className="flex items-center justify-between p-6 border-b bg-[#1E3A6B] text-white">
            <div className="flex items-right space-x-20">
              <span className="text-3xl font-semibold">{ticket.ticketId}</span>
              <div className="flex items-center gap-4">
                <Select
                  value={editedData.priority}
                  onValueChange={(value) => handleQuickUpdate('priority', value)}
                >
                  <SelectTrigger className="border-0 bg-[#1E3A6B] transition-colors min-h-5 h-auto p-0 w-auto">
                    <Badge className={getPriorityStyle(editedData.priority)}>
                      {editedData.priority?.toUpperCase()}

                    </Badge>
                  </SelectTrigger>
                  <SelectContent className="bg-white border shadow-md rounded-md">
                    {PRIORITY_OPTIONS.map((priority) => (
                      <SelectItem
                        key={priority.value}
                        value={priority.value}
                        className="hover:bg-gray-100 cursor-pointer"
                      >
                        <Badge className={getPriorityStyle(priority.value)}>
                          {priority.label.toUpperCase()}
                        </Badge>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select
                  value={editedData.status}
                  onValueChange={(value) => handleQuickUpdate('status', value)}
                >
                  <SelectTrigger className="border-0 bg-[#1E3A6B] transition-colors min-h-0 h-auto p-0">
                    <Badge variant="outline" className="border-white/20 text-white">
                      {editedData.status}
                    </Badge>
                  </SelectTrigger>
                  <SelectContent className="bg-white border shadow-md rounded-md">
                    {STATUS_OPTIONS.map((status) => (
                      <SelectItem
                        key={status.value}
                        value={status.value}
                        className="hover:bg-gray-100 cursor-pointer"
                      >
                        {status.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="text-white hover:bg-[#12327A]"
              onClick={onClose}
            >
              <X className="h-5 w-5" />
            </Button>
          </div>
          <div className="text-sm text-gray-300 mt-2">
            Created on {new Date(ticket.createdAt).toLocaleString()}
          </div>
        </DialogHeader>

        <Tabs defaultValue="details" className="bg-white">
          <div className="border-b bg-white">
            <TabsList className="w-full rounded-none border-0 bg-[#f8f9fa]">
              <TabsTrigger
                value="details"
                className="flex-1 rounded-none border-b-2 border-transparent data-[state=active]:border-[#1E3A6B] text-gray-600 data-[state=active]:text-[#1E3A6B] data-[state=active]:bg-white"
              >
                Details
              </TabsTrigger>
              <TabsTrigger
                value="comments"
                className="flex-1 rounded-none border-b-2 border-transparent data-[state=active]:border-[#1E3A6B] text-gray-600 data-[state=active]:text-[#1E3A6B] data-[state=active]:bg-white"
              >
                Comments
              </TabsTrigger>
              <TabsTrigger
                value="files"
                className="flex-1 rounded-none border-b-2 border-transparent data-[state=active]:border-[#1E3A6B] text-gray-600 data-[state=active]:text-[#1E3A6B] data-[state=active]:bg-white"
              >
                Files
              </TabsTrigger>
            </TabsList>
          </div>

          <div className="p-6 bg-white">
            <TabsContent value="details" className="mt-0 space-y-6">
              <div className="bg-white p-4 rounded-lg border">
                <h3 className="text-lg font-semibold mb-4">Ticket Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Left Column */}
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-600 mb-1">
                        Subject
                      </label>
                      <Input
                        value={editedData.subject}
                        onChange={(e) => handleQuickUpdate('subject', e.target.value)}
                        className="w-full bg-white"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-600 mb-1">
                        Description
                      </label>
                      <Textarea
                        value={editedData.description}
                        onChange={(e) => handleQuickUpdate('description', e.target.value)}
                        className="w-full min-h-[100px]"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-600 mb-1">
                        Location
                      </label>
                      <Input
                        value={editedData.location}
                        onChange={(e) => handleQuickUpdate('location', e.target.value)}
                        className="w-full bg-white"
                        placeholder="Enter location"
                      />
                    </div>
                  </div>

                  {/* Right Column */}
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-600 mb-1">
                        Reported By
                      </label>
                      <div className="text-sm bg-gray-50 p-2 rounded">
                        {typeof editedData.requester === 'object'
                          ? `${editedData.requester.name || ''} ${editedData.requester.surname || ''}`
                          : editedData.requester}
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-600 mb-1">
                        Created
                      </label>
                      <div className="text-sm bg-gray-50 p-2 rounded">
                        {new Date(editedData.createdAt).toLocaleString('en-GB', {
                          dateStyle: 'medium',
                          timeStyle: 'short'
                        })}
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-600 mb-1">
                        Due Date
                      </label>
                      <Input
                        type="date"
                        value={editedData.dueDate || ''}
                        onChange={(e) => handleQuickUpdate('dueDate', e.target.value)}
                        className="w-full bg-white"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-600 mb-1">
                        Category
                      </label>
                      <Input
                        value={editedData.category || ''}
                        onChange={(e) => handleQuickUpdate('category', e.target.value)}
                        className="w-full bg-white"
                        placeholder="Enter category"
                      />
                    </div>

                    {editedData.lastUpdated && (
                      <div>
                        <label className="block text-sm font-medium text-gray-600 mb-1">
                          Last Updated
                        </label>
                        <div className="text-sm bg-gray-50 p-2 rounded">
                          {new Date(editedData.lastUpdated).toLocaleString('en-GB', {
                            dateStyle: 'medium',
                            timeStyle: 'short'
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="bg-[#1E3A6B] p-4 rounded-lg">
                <h3 className="text-lg font-semibold mb-4 text-white">Assignment</h3>
                <Select
                  value={editedData.assignedTo || "unassigned"}
                  onValueChange={(value) => handleQuickUpdate('assignedTo', value === 'unassigned' ? null : value)}
                >
                  <SelectTrigger className="w-full bg-white">
                    <SelectValue placeholder="Assign to staff member" />
                  </SelectTrigger>
                  <SelectContent className="bg-white border shadow-lg">
                    <SelectItem value="unassigned">Unassigned</SelectItem>
                    {staffMembers?.map((staff) => (
                      <SelectItem
                        key={staff.id}
                        value={staff.id}
                        className="hover:bg-gray-100"
                      >
                        {staff.name} - {staff.department}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </TabsContent>

            <TabsContent value="comments" className="mt-0">
              <TicketComments ticketId={ticket.id} />
            </TabsContent>

            <TabsContent value="files" className="mt-0">
              <FileUpload ticketId={ticket.id} />
            </TabsContent>
          </div>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};

export default TicketDetailsModal;