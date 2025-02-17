// src/components/tickets/TicketDetailView.jsx
import React from 'react';
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { 
  Clock, 
  Building, 
  User, 
  Calendar,
  MessageSquare,
  Paperclip,
  AlertCircle 
} from 'lucide-react';
import { TicketComments } from './TicketComments';
import { FileAttachments } from './FileAttachments';

export function TicketDetailView({ ticket, isOpen, onClose }) {
  if (!ticket) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl h-[80vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span>{ticket.ticketId}</span>
              <Badge className={getPriorityStyle(ticket.priority)}>
                {ticket.priority.toUpperCase()}
              </Badge>
              <Badge variant="outline">{ticket.status}</Badge>
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
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium">Subject</label>
                      <p className="text-lg">{ticket.subject}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium">Location</label>
                      <p className="text-lg">{ticket.location}</p>
                    </div>
                  </div>

                  <div>
                    <label className="text-sm font-medium">Description</label>
                    <p className="mt-1 whitespace-pre-wrap">{ticket.description}</p>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <InfoCard
                      icon={<User className="h-4 w-4" />}
                      label="Requester"
                      value={ticket.requester}
                    />
                    <InfoCard
                      icon={<Building className="h-4 w-4" />}
                      label="Building"
                      value={ticket.location}
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
                  <StaffAssignment ticket={ticket} />
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="comments">
            <TicketComments ticketId={ticket.id} />
          </TabsContent>

          <TabsContent value="files">
            <FileAttachments ticketId={ticket.id} />
          </TabsContent>

          <TabsContent value="history">
            <TicketHistory ticketId={ticket.id} />
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}

function InfoCard({ icon, label, value }) {
  return (
    <div className="flex items-start gap-2 p-3 rounded-lg bg-muted">
      {icon}
      <div>
        <p className="text-sm text-muted-foreground">{label}</p>
        <p className="font-medium">{value}</p>
      </div>
    </div>
  );
}

// Helper function to get priority styles
function getPriorityStyle(priority) {
  const styles = {
    high: "bg-red-100 text-red-800 border-red-200",
    medium: "bg-yellow-100 text-yellow-800 border-yellow-200",
    low: "bg-green-100 text-green-800 border-green-200"
  };
  return styles[priority] || styles.medium;
}