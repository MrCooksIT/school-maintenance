// src/components/tickets/TicketComments.jsx
import React, { useState, useEffect } from 'react';
import { ref, push, onValue } from 'firebase/database';
import { database, auth } from '@/config/firebase';
import { Button } from '../ui/button';
import { Textarea } from '../ui/textarea';
import { format } from 'date-fns';
import { useAuthState } from 'react-firebase-hooks/auth';

export function TicketComments({ ticketId }) {
    const [comments, setComments] = useState([]);
    const [newComment, setNewComment] = useState('');
    const [user] = useAuthState(auth);

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
        if (!newComment.trim() || !user) return;

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
        }
    };

    return (
        <div className="flex flex-col h-full bg-[#0a1e46] text-white">
            {/* Comments List */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {comments.map((comment) => (
                    <div key={comment.id} className="bg-[#0f2a5e] rounded-lg p-4 border border-gray-700">
                        <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                                {comment.userPhotoURL ? (
                                    <img
                                        src={comment.userPhotoURL}
                                        alt={comment.user}
                                        className="w-8 h-8 rounded-full"
                                    />
                                ) : (
                                    <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center uppercase">
                                        {comment.user?.[0] || 'A'}
                                    </div>
                                )}
                                <span className="font-medium">{comment.user}</span>
                            </div>
                            <span className="text-sm text-gray-300">
                                {format(new Date(comment.timestamp), 'MMM d, yyyy, h:mm a')}
                            </span>
                        </div>
                        <p className="text-sm">{comment.content}</p>
                    </div>
                ))}
            </div>

            {/* Comment Input - Fixed at bottom */}
            <div className="border-t border-gray-700 p-4 bg-[#0f2a5e] mt-auto">
                <form onSubmit={handleSubmitComment} className="space-y-2">
                    <Textarea
                        value={newComment}
                        onChange={(e) => setNewComment(e.target.value)}
                        placeholder="Add a comment..."
                        className="min-h-[100px] resize-none bg-[#0a1e46] border-gray-700 text-white placeholder:text-gray-400"
                    />
                    <div className="flex justify-end">
                        <Button
                            type="submit"
                            className="bg-blue-600 hover:bg-blue-700 text-white"
                            disabled={!newComment.trim() || !user}
                        >
                            Post Comment
                        </Button>
                    </div>
                </form>
            </div>
        </div>
    );
}