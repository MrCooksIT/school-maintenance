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
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { AlertCircle } from 'lucide-react';

// Enhanced pause reasons with more details
const PAUSE_REASONS = [
    {
        value: 'awaiting_parts',
        label: 'Awaiting Parts',
        requiresApproval: true,
        category: 'procurement'
    },
    {
        value: 'awaiting_info',
        label: 'Awaiting More Information',
        requiresApproval: false,
        category: 'communication'
    },
    {
        value: 'vendor_scheduling',
        label: 'Vendor Scheduling',
        requiresApproval: true,
        category: 'external'
    },
    {
        value: 'budget_approval',
        label: 'Budget Approval Required',
        requiresApproval: true,
        category: 'financial'
    },
    {
        value: 'out_of_stock',
        label: 'Parts Out of Stock',
        requiresApproval: true,
        category: 'procurement'
    },
    {
        value: 'pending_purchase',
        label: 'Pending Purchase Order',
        requiresApproval: true,
        category: 'procurement'
    },
    {
        value: 'staff_unavailable',
        label: 'Staff Unavailable',
        requiresApproval: false,
        category: 'internal'
    },
    {
        value: 'other',
        label: 'Other Reason',
        requiresApproval: false,
        category: 'general'
    }
];

const PauseReasonModal = ({ open, onOpenChange, onPause }) => {
    const [reason, setReason] = useState('awaiting_parts');
    const [customReason, setCustomReason] = useState('');
    const [estimatedDuration, setEstimatedDuration] = useState('');
    const [notifySupervisor, setNotifySupervisor] = useState(false);

    // Auto-set notify supervisor based on reason category
    const selectedReason = PAUSE_REASONS.find(r => r.value === reason);
    const isProcurement = selectedReason?.category === 'procurement';
    const requiresApproval = selectedReason?.requiresApproval || false;

    // Set notifySupervisor when reason changes
    React.useEffect(() => {
        // Auto-enable notifications for procurement/approval issues
        if (isProcurement || requiresApproval) {
            setNotifySupervisor(true);
        }
    }, [reason, isProcurement, requiresApproval]);

    const handleSubmit = () => {
        const pauseReason = reason === 'other'
            ? customReason
            : PAUSE_REASONS.find(r => r.value === reason)?.label || 'Unknown';

        // Enhanced pause data
        const pauseData = {
            reason: pauseReason,
            reasonCode: reason,
            estimatedDuration: estimatedDuration,
            category: selectedReason?.category,
            requiresApproval: requiresApproval,
            notifySupervisor: notifySupervisor,
            timestamp: new Date().toISOString(),
        };

        onPause(pauseData);
        onOpenChange(false);
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle>Pause Ticket</DialogTitle>
                    <DialogDescription>
                        Provide a reason for pausing this ticket. This will be documented in the ticket history.
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-4">
                    <div className="space-y-2">
                        <Label className="text-sm font-medium">Reason for Pausing</Label>
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
                            <Label className="text-sm font-medium">Specify Reason</Label>
                            <Textarea
                                value={customReason}
                                onChange={(e) => setCustomReason(e.target.value)}
                                placeholder="Enter specific reason for pausing this ticket"
                                className="min-h-[80px]"
                            />
                        </div>
                    )}

                    <div className="space-y-2">
                        <Label className="text-sm font-medium">Estimated Duration</Label>
                        <Select
                            value={estimatedDuration}
                            onValueChange={setEstimatedDuration}
                        >
                            <SelectTrigger>
                                <SelectValue placeholder="How long will this ticket be paused?" />
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

                    {/* Notification options */}
                    <div className="flex items-center space-x-2 pt-2">
                        <Switch
                            id="notify-supervisor"
                            checked={notifySupervisor}
                            onCheckedChange={setNotifySupervisor}
                            disabled={isProcurement || requiresApproval}
                        />
                        <Label htmlFor="notify-supervisor">
                            Notify supervisor about this pause
                        </Label>
                    </div>

                    {(isProcurement || requiresApproval) && (
                        <div className="bg-blue-50 p-3 rounded-md flex gap-2 text-sm text-blue-800">
                            <AlertCircle className="h-5 w-5 text-blue-500 flex-shrink-0" />
                            <div>
                                <p>This pause reason requires supervisor notification.</p>
                                <p>Estate manager will be automatically notified of procurement-related pauses.</p>
                            </div>
                        </div>
                    )}
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)}>
                        Cancel
                    </Button>
                    <Button
                        onClick={handleSubmit}
                        className="bg-purple-600 hover:bg-purple-700"
                        disabled={reason === 'other' && !customReason.trim() || !estimatedDuration}
                    >
                        Pause Ticket
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};

export default PauseReasonModal;