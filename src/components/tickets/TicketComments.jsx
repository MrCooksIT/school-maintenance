// src/components/tickets/TicketComments.jsx
import React, { useState, useEffect } from 'react';
import { ref, push, onValue } from 'firebase/database';
import { database, auth } from '@/config/firebase';
import { Button } from '../ui/button';
import { Textarea } from '../ui/textarea';
import { format } from 'date-fns';
import { useAuthState } from 'react-firebase-hooks/auth';
import { Avatar, AvatarFallback, AvatarImage } from "../ui/Avatar";
import { Send } from 'lucide-react';

export function TicketComments({ ticketId }) {
    const [comments, setComments] = useState([]);
    const [newComment, setNewComment] = useState('');
    const [user] = useAuthState(auth);
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        if (!ticketId) return;
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
            } else {
                setComments([]);
            }
        });

        return () => unsubscribe();
    }, [ticketId]);

    const handleSubmitComment = async (e) => {
        e.preventDefault();
        if (!newComment.trim() || !user || isSubmitting) return;

        setIsSubmitting(true);
        try {
            const commentsRef = ref(database, `tickets/${ticketId}/comments`);
            await push(commentsRef, {
                content: newComment.trim(),
                user: user.displayName || 'Anonymous',
                userEmail: user.email,
                userPhotoURL: user.photoURL,
                timestamp: new Date().toISOString()
            });
            setNewComment('');
        } catch (error) {
            console.error('Error adding comment:', error);
        } finally {
            setIsSubmitting(false);
        }
    };

    const getInitials = (name) => {
        return name
            .split(' ')
            .map(part => part[0])
            .join('')
            .toUpperCase();
    };

    return (
        <div className="flex flex-col h-full">
            {/* Fixed height comment list with sticky comment form at bottom */}
            <div className="flex flex-col h-full">
                {/* Comments List - Allow this to scroll */}
                <div className="flex-1 overflow-auto p-6 bg-gray-50">
                    {comments.length === 0 ? (
                        <div className="text-center py-12 text-gray-500">
                            No comments yet. Be the first to comment!
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {comments.map((comment) => (
                                <div key={comment.id} className="flex space-x-4">
                                    <Avatar className="h-10 w-10 flex-shrink-0">
                                        {comment.userPhotoURL ? (
                                            <AvatarImage src={comment.userPhotoURL} alt={comment.user} />
                                        ) : null}
                                        <AvatarFallback className="bg-blue-600 text-white">
                                            {getInitials(comment.user)}
                                        </AvatarFallback>
                                    </Avatar>
                                    <div className="flex-1">
                                        <div className="bg-white p-4 rounded-lg shadow-sm">
                                            <div className="flex justify-between items-start mb-2">
                                                <span className="font-medium text-sm">{comment.user}</span>
                                                <span className="text-xs text-gray-500">
                                                    {format(new Date(comment.timestamp), 'MMM d, yyyy, h:mm a')}
                                                </span>
                                            </div>
                                            <p className="text-sm text-gray-700">{comment.content}</p>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Comment Input - Always visible at bottom */}
                <div className="p-4 bg-white border-t sticky bottom-0">
                    <form onSubmit={handleSubmitComment} className="flex items-end gap-2">
                        <div className="flex-1">
                            <Textarea
                                value={newComment}
                                onChange={(e) => setNewComment(e.target.value)}
                                placeholder="Add a comment..."
                                className="min-h-[60px] max-h-[120px] resize-none border-gray-300 focus:border-blue-500"
                            />
                        </div>
                        <Button
                            type="submit"
                            className="bg-blue-600 hover:bg-blue-700 text-white"
                            disabled={!newComment.trim() || !user || isSubmitting}
                        >
                            <Send className="h-4 w-4 mr-2" />
                            Post
                        </Button>
                    </form>
                </div>
            </div>
        </div>
    );
}