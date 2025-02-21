// src/components/tickets/TicketDetailView.jsx
import React, { useState, useEffect } from 'react';
import { ref, update, onValue } from 'firebase/database';
import { database, auth } from '@/config/firebase';
import { format } from 'date-fns';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription
} from '../ui/dialog';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle
} from '../ui/card';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Textarea } from '../ui/textarea';
import { Input } from '../ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import {
  Clock,
  Building,
  User,
  Calendar,
  MessageSquare,
  Paperclip,
  AlertCircle,
  Edit2,
  Save,
  X
} from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';
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

export function TicketDetailView({ ticket, isOpen, onClose, staffMembers }) {
  const [editedData, setEditedData] = useState(ticket);
  const [isEditing, setIsEditing] = useState({
    subject: false,
    description: false,
    location: false
  });

  useEffect(() => {
    setEditedData(ticket);
  }, [ticket]);

  if (!ticket) return null;

  const handleUpdate = async (field, value) => {
    try {
      const updates = {
        [`tickets/${ticket.id}/${field}`]: value,
        [`tickets/${ticket.id}/lastUpdated`]: new Date().toISOString(),
        [`tickets/${ticket.id}/history/${new Date().getTime()}`]: {
          type: 'update',
          field,
          oldValue: ticket[field],
          newValue: value,
          timestamp: new Date().toISOString(),
          user: auth.currentUser?.displayName || auth.currentUser?.email
        }
      };

      await update(ref(database), updates);
      setIsEditing(prev => ({ ...prev, [field]: false }));
    } catch (error) {
      console.error('Error updating ticket:', error);
    }
  };

  const handleStartEditing = (field) => {
    setIsEditing(prev => ({ ...prev, [field]: true }));
  };

  const handleCancelEditing = (field) => {
    setIsEditing(prev => ({ ...prev, [field]: false }));
    setEditedData(prev => ({ ...prev, [field]: ticket[field] }));
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl h-[80vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span>{ticket.ticketId}</span>
              <div className="cursor-pointer">
                <Select
                  value={editedData.priority}
                  onValueChange={(value) => handleUpdate('priority', value)}
                >
                  <SelectTrigger className="border-none p-0 h-auto bg-transparent">
                    <Badge className={getPriorityStyle(editedData.priority)}>
                      {editedData.priority.toUpperCase()}
                    </Badge>
                  </SelectTrigger>
                  <SelectContent>
                    {PRIORITY_OPTIONS.map((p) => (
                      <SelectItem key={p.value} value={p.value}>
                        {p.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="cursor-pointer">
                <Select
                  value={editedData.status}
                  onValueChange={(value) => handleUpdate('status', value)}
                >
                  <SelectTrigger className="border-none p-0 h-auto bg-transparent">
                    <Badge variant="outline">{editedData.status}</Badge>
                  </SelectTrigger>
                  <SelectContent>
                    {STATUS_OPTIONS.map((s) => (
                      <SelectItem key={s.value} value={s.value}>
                        {s.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </DialogTitle>
          <DialogDescription>
            Created {format(new Date(ticket.createdAt), 'PPP')}
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="details" className="h-full">
          <TabsList>
            <TabsTrigger value="details">Details</TabsTrigger>
            <TabsTrigger value="comments">Comments</TabsTrigger>
            <TabsTrigger value="files">Files</TabsTrigger>
            <TabsTrigger value="history">History</TabsTrigger>
          </TabsList>

          <TabsContent value="details" className="h-[calc(100%-40px)] overflow-auto">
            <div className="grid gap-4">
              <Card>
                <CardHeader>
                  <CardTitle>Ticket Information</CardTitle>
                </CardHeader>
                <CardContent className="grid gap-4">
                  <div className="grid gap-4">
                    <div className="relative group">
                      <label className="text-sm font-medium">Subject</label>
                      {isEditing.subject ? (
                        <div className="flex gap-2">
                          <Input
                            value={editedData.subject}
                            onChange={(e) => setEditedData(prev => ({ ...prev, subject: e.target.value }))}
                            className="mt-1"
                          />
                          <Button
                            size="sm"
                            onClick={() => handleUpdate('subject', editedData.subject)}
                          >
                            <Save className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleCancelEditing('subject')}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      ) : (
                        <div className="mt-1 relative">
                          <p className="text-lg">{ticket.subject}</p>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="absolute top-0 right-0 opacity-0 group-hover:opacity-100"
                            onClick={() => handleStartEditing('subject')}
                          >
                            <Edit2 className="h-4 w-4" />
                          </Button>
                        </div>
                      )}
                    </div>

                    <div className="relative group">
                      <label className="text-sm font-medium">Description</label>
                      {isEditing.description ? (
                        <div className="flex gap-2">
                          <Textarea
                            value={editedData.description}
                            onChange={(e) => setEditedData(prev => ({ ...prev, description: e.target.value }))}
                            className="mt-1"
                            rows={4}
                          />
                          <div className="flex flex-col gap-2">
                            <Button
                              size="sm"
                              onClick={() => handleUpdate('description', editedData.description)}
                            >
                              <Save className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleCancelEditing('description')}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <div className="mt-1 relative">
                          <p className="whitespace-pre-wrap">{ticket.description}</p>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="absolute top-0 right-0 opacity-0 group-hover:opacity-100"
                            onClick={() => handleStartEditing('description')}
                          >
                            <Edit2 className="h-4 w-4" />
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <InfoCard
                      icon={<User className="h-4 w-4" />}
                      label="Requester"
                      value={typeof ticket.requester === 'object'
                        ? ticket.requester.email
                        : ticket.requester}
                    />
                    <InfoCard
                      icon={<Building className="h-4 w-4" />}
                      label="Building"
                      value={ticket.location}
                      editable
                      onEdit={() => handleStartEditing('location')}
                      isEditing={isEditing.location}
                      editedValue={editedData.location}
                      onEditChange={(value) => setEditedData(prev => ({ ...prev, location: value }))}
                      onSave={() => handleUpdate('location', editedData.location)}
                      onCancel={() => handleCancelEditing('location')}
                    />
                    <InfoCard
                      icon={<Calendar className="h-4 w-4" />}
                      label="Created"
                      value={format(new Date(ticket.createdAt), 'PPp')}
                    />
                    <InfoCard
                      icon={<Clock className="h-4 w-4" />}
                      label="Last Updated"
                      value={format(new Date(ticket.lastUpdated), 'PPp')}
                    />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Assignment</CardTitle>
                </CardHeader>
                <CardContent>
                  <Select
                    value={editedData.assignedTo || "unassigned"}
                    onValueChange={(value) => handleUpdate('assignedTo', value === 'unassigned' ? null : value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Assign to..." />
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
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="comments">
            <TicketComments ticketId={ticket.id} />
          </TabsContent>

          <TabsContent value="files">
            <FileUpload ticketId={ticket.id} />
          </TabsContent>

          <TabsContent value="history">
            <TicketHistory ticketId={ticket.id} />
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}

function InfoCard({ icon, label, value, editable, onEdit, isEditing, editedValue, onEditChange, onSave, onCancel }) {
  return (
    <div className="flex items-start gap-2 p-3 rounded-lg bg-muted relative group">
      {icon}
      <div className="flex-1">
        <p className="text-sm text-muted-foreground">{label}</p>
        {editable && isEditing ? (
          <div className="flex gap-2 mt-1">
            <Input
              value={editedValue}
              onChange={(e) => onEditChange(e.target.value)}
              className="h-8"
            />
            <Button size="sm" onClick={onSave}>
              <Save className="h-4 w-4" />
            </Button>
            <Button size="sm" variant="ghost" onClick={onCancel}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        ) : (
          <p className="font-medium">
            {value}
            {editable && (
              <Button
                variant="ghost"
                size="sm"
                className="absolute top-2 right-2 opacity-0 group-hover:opacity-100"
                onClick={onEdit}
              >
                <Edit2 className="h-4 w-4" />
              </Button>
            )}
          </p>
        )}
      </div>
    </div>
  );
}

function TicketHistory({ ticketId }) {
  const [history, setHistory] = useState([]);

  useEffect(() => {
    const historyRef = ref(database, `tickets/${ticketId}/history`);
    const unsubscribe = onValue(historyRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = Object.values(snapshot.val())
          .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
        setHistory(data);
      }
    });
    return () => unsubscribe();
  }, [ticketId]);

  return (
    <div className="space-y-4 p-4">
      {history.map((event, index) => (
        <div key={index} className="flex gap-3 p-3 bg-muted rounded-lg">
          <AlertCircle className="h-4 w-4 flex-shrink-0 mt-1" />
          <div>
            <p className="text-sm">
              {event.user} updated {event.field} from{' '}
              <span className="font-medium">{event.oldValue}</span> to{' '}
              <span className="font-medium">{event.newValue}</span>
            </p>
            <p className="text-xs text-muted-foreground">
              {format(new Date(event.timestamp), 'PPp')}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}

function getPriorityStyle(priority) {
  const styles = {
    high: "bg-red-100 text-red-800 border-red-200",
    medium: "bg-yellow-100 text-yellow-800 border-yellow-200",
    low: "bg-green-100 text-green-800 border-green-200"
  };
  return styles[priority] || styles.medium;
}

export default TicketDetailView;