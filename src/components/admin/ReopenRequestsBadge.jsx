
// src/components/admin/ReopenRequestsBadge.jsx
import React, { useState, useEffect } from 'react';
import { ref, onValue } from 'firebase/database';
import { database } from '@/config/firebase';
import { Link } from 'react-router-dom';
import { Badge } from "@/components/ui/badge";
import { RotateCcw } from 'lucide-react';

/**
 * A badge component to show the number of pending reopen requests
 * Designed to be used in navigation or admin dashboard
 */
const ReopenRequestsBadge = ({ className = "" }) => {
    const [count, setCount] = useState(0);

    useEffect(() => {
        // Query tickets with reopen requests
        const ticketsRef = ref(database, 'tickets');
        const unsubscribe = onValue(ticketsRef, (snapshot) => {
            if (snapshot.exists()) {
                // Count tickets with reopenRequested=true
                let reopenCount = 0;
                snapshot.forEach(childSnapshot => {
                    const ticket = childSnapshot.val();
                    if (ticket.reopenRequested === true) {
                        reopenCount++;
                    }
                });

                setCount(reopenCount);
            } else {
                setCount(0);
            }
        });

        return () => unsubscribe();
    }, []);

    // Don't render anything if no reopen requests
    if (count === 0) {
        return null;
    }

    return (
        <Link
            to="/admin/reopen-requests"
            className={`relative inline-flex items-center ${className}`}
        >
            <RotateCcw className="h-5 w-5 text-yellow-500" />
            <Badge className="ml-1 bg-yellow-500 text-white">
                {count}
            </Badge>
        </Link>
    );
};

export default ReopenRequestsBadge;