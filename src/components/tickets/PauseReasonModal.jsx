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
import { AlertCircle } from 'lucide-react';

// Simple pause reasons
const PAUSE_REASONS = [
    { value: 'awaiting_parts', label: 'Awaiting Parts', category: 'procurement' },
    { value: 'awaiting_info', label: 'Awaiting More Information', category: 'communication' },
    { value: 'vendor_scheduling', label: 'Vendor Scheduling', category: 'external' },
    { value: 'budget_approval', label: 'Budget Approval Required', category: 'financial' },
    { value: 'out_of_stock', label: 'Parts Out of Stock', category: 'procurement' },
    { value: 'staff_unavailable', label: 'Staff Unavailable', category: 'internal' },
    { value: 'other', label: 'Other Reason', category: 'general' }
];

const PauseReasonModal = ({ open, onOpenChange, onPause }) => {
    const [reason, setReason] = useState('awaiting_parts');
    const [customReason, setCustomReason] = useState('');
    const [estimatedDuration, setEstimatedDuration] = useState('1_week');
    const [notifySupervisor, setNotifySupervisor] = useState(false);

    // Simple selected reason lookup
    const selectedReason = PAUSE_REASONS.find(r => r.value === reason);
    const isProcurement = selectedReason?.category === 'procurement';

    const handleSubmit = () => {
        // Get display text for the reason
        const reasonText = reason === 'other'
            ? customReason
            : PAUSE_REASONS.find(r => r.value === reason)?.label || 'Unknown';

        // Create simplified pause data
        const pauseData = {
            reason: reasonText,
            reasonCode: reason,
            estimatedDuration: estimatedDuration,
            category: selectedReason?.category,
            notifySupervisor: notifySupervisor || isProcurement,
            timestamp: new Date().toISOString()
        };

        // Pass the data back to the parent
        onPause(pauseData);

        // Don't close the dialog here - let the parent handle it
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Pause Ticket</DialogTitle>
                    <DialogDescription>
                        Provide a reason for pausing this ticket.
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-4">
                    {/* Reason Selection */}
                    <div className="space-y-2">
                        <label className="text-sm font-medium">Reason for Pausing</label>
                        <Select value={reason} onValueChange={setReason}>
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

                    {/* Custom Reason Field */}
                    {reason === 'other' && (
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Specify Reason</label>
                            <Textarea
                                value={customReason}
                                onChange={(e) => setCustomReason(e.target.value)}
                                placeholder="Enter specific reason"
                                className="min-h-[80px]"
                            />
                        </div>
                    )}

                    {/* Duration Selection */}
                    <div className="space-y-2">
                        <label className="text-sm font-medium">Estimated Duration</label>
                        <Select value={estimatedDuration} onValueChange={setEstimatedDuration}>
                            <SelectTrigger>
                                <SelectValue placeholder="How long will this be paused?" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="1_day">1 Day</SelectItem>
                                <SelectItem value="2_3_days">2-3 Days</SelectItem>
                                <SelectItem value="1_week">1 Week</SelectItem>
                                <SelectItem value="2_weeks">2 Weeks</SelectItem>
                                <SelectItem value="1_month">1 Month</SelectItem>
                                <SelectItem value="unknown">Unknown</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    {/* Notification Checkbox */}
                    <div className="flex items-center gap-2 pt-2">
                        <input
                            type="checkbox"
                            id="notify-supervisor"
                            checked={notifySupervisor}
                            onChange={(e) => setNotifySupervisor(e.target.checked)}
                            className="h-4 w-4"
                        />
                        <label htmlFor="notify-supervisor" className="text-sm">
                            Notify supervisor about this pause
                        </label>
                    </div>

                    {/* Procurement Info */}
                    {isProcurement && (
                        <div className="bg-blue-50 p-3 rounded-md flex gap-2 text-sm text-blue-800">
                            <AlertCircle className="h-5 w-5 text-blue-500 flex-shrink-0" />
                            <p>Estate manager will be notified about this procurement-related pause.</p>
                        </div>
                    )}
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)}>
                        Cancel
                    </Button>
                    <Button
                        onClick={handleSubmit}
                        className="bg-purple-600 hover:bg-purple-700 text-white"
                        disabled={reason === 'other' && !customReason.trim()}
                    >
                        Pause Ticket
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};

export default PauseReasonModal;