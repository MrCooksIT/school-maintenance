// src/components/tickets/TicketComments.jsx
import React, { useState, useEffect } from 'react';
import { ref, push, onValue, serverTimestamp } from 'firebase/database';
import { database } from '@/config/firebase';
import { format } from 'date-fns';
import { Button } from '../ui/button';
import { Textarea } from '../ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle
} from '../ui/card';
import { Badge } from '../ui/badge';
import { Send, AlertCircle } from 'lucide-react';

export function TicketComments({ ticketId }) {
    const [comments, setComments] = useState([]);
    const [newComment, setNewComment] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        const commentsRef = ref(database, `tickets/${ticketId}/comments`);
        const unsubscribe = onValue(commentsRef, (snapshot) => {
            if (snapshot.exists()) {
                const commentsData = Object.entries(snapshot.val())
                    .map(([id, comment]) => ({
                        id,
                        ...comment
                    }))
                    .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
                setComments(commentsData);
            }
        });

        return () => unsubscribe();
    }, [ticketId]);

    const handleSubmitComment = async (e) => {
        e.preventDefault();
        if (!newComment.trim()) return;

        setIsSubmitting(true);
        try {
            const commentsRef = ref(database, `tickets/${ticketId}/comments`);
            await push(commentsRef, {
                content: newComment.trim(),
                author: {
                    name: "Current User", // Replace with actual user data
                    id: "user123",
                    role: "Maintenance Staff"
                },
                timestamp: new Date().toISOString(),
                type: 'comment' // Can be 'comment', 'status_update', 'assignment', etc.
            });
            setNewComment('');
        } catch (error) {
            console.error('Error adding comment:', error);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="space-y-4">
            <Card>
                <CardHeader>
                    <CardTitle className="text-sm font-medium">Add Comment</CardTitle>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSubmitComment} className="space-y-4">
                        <Textarea
                            value={newComment}
                            onChange={(e) => setNewComment(e.target.value)}
                            placeholder="Add a comment or update..."
                            className="min-h-[100px]"
                        />
                        <div className="flex justify-end">
                            <Button
                                type="submit"
                                disabled={isSubmitting || !newComment.trim()}
                            >
                                <Send className="h-4 w-4 mr-2" />
                                {isSubmitting ? 'Sending...' : 'Send'}
                            </Button>
                        </div>
                    </form>
                </CardContent>
            </Card>

            <div className="space-y-4">
                {comments.map((comment) => (
                    <CommentItem key={comment.id} comment={comment} />
                ))}
            </div>
        </div>
    );
}

function CommentItem({ comment }) {
    return (
        <div className="flex gap-4 p-4 rounded-lg border bg-card">
            <Avatar>
                <AvatarFallback>
                    {comment.author.name.split(' ').map(n => n[0]).join('')}
                </AvatarFallback>
            </Avatar>

            <div className="flex-1 space-y-1">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <span className="font-medium">{comment.author.name}</span>
                        <Badge variant="outline">{comment.author.role}</Badge>
                    </div>
                    <span className="text-sm text-muted-foreground">
                        {format(new Date(comment.timestamp), 'PPp')}
                    </span>
                </div>

                <p className="text-sm whitespace-pre-wrap">{comment.content}</p>

                {comment.type === 'status_update' && (
                    <div className="flex items-center gap-2 mt-2 text-sm text-muted-foreground">
                        <AlertCircle className="h-4 w-4" />
                        <span>Status updated to: {comment.newStatus}</span>
                    </div>
                )}
            </div>
        </div>
    );
}