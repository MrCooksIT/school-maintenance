// src/components/tickets/PauseReasonModal.jsx
import React, { useState } from 'react';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";

const PAUSE_REASONS = [
    { value: 'awaiting_parts', label: 'Awaiting Parts' },
    { value: 'awaiting_info', label: 'Awaiting More Information' },
    { value: 'vendor_scheduling', label: 'Vendor Scheduling' },
    { value: 'budget_approval', label: 'Budget Approval Required' },
    { value: 'other', label: 'Other Reason' }
];

const PauseReasonModal = ({ open, onOpenChange, onPause }) => {
    const [reason, setReason] = useState('awaiting_parts');
    const [customReason, setCustomReason] = useState('');

    const handleSubmit = () => {
        const pauseReason = reason === 'other'
            ? customReason
            : PAUSE_REASONS.find(r => r.value === reason)?.label || 'Unknown';

        onPause(pauseReason);
        onOpenChange(false);
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Pause Ticket</DialogTitle>
                    <DialogDescription>
                        Provide a reason for pausing this ticket. This will be documented in the ticket history.
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-4">
                    <div className="space-y-2">
                        <label className="text-sm font-medium">Reason for Pausing</label>
                        <Select
                            value={reason}
                            onValueChange={setReason}
                        >
                            <SelectTrigger>
                                <SelectValue placeholder="Select reason" />
                            </SelectTrigger>
                            <SelectContent>
                                {PAUSE_REASONS.map((r) => (
                                    <SelectItem key={r.value} value={r.value}>
                                        {r.label}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    {reason === 'other' && (
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Specify Reason</label>
                            <Textarea
                                value={customReason}
                                onChange={(e) => setCustomReason(e.target.value)}
                                placeholder="Enter specific reason for pausing this ticket"
                                className="min-h-[80px]"
                            />
                        </div>
                    )}
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)}>
                        Cancel
                    </Button>
                    <Button onClick={handleSubmit} className="bg-purple-600 hover:bg-purple-700">
                        Pause Ticket
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};

export default PauseReasonModal;