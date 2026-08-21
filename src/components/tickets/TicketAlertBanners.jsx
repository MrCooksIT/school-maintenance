// src/components/tickets/TicketAlertBanners.jsx
//
// Two prompts at the top of the dashboard: tickets waiting to be assigned, and
// tickets that have sailed past their due date. Both are clickable - an alert
// you cannot act on just becomes wallpaper.

import React from 'react';
import { UserPlus, AlarmClock, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

const Banner = ({ tone, Icon, headline, detail, actionLabel, onAction }) => {
    const tones = {
        amber: {
            wrap: 'bg-amber-50 border-amber-200 text-amber-900',
            icon: 'text-amber-600',
            button: 'border-amber-300 text-amber-900 hover:bg-amber-100'
        },
        red: {
            wrap: 'bg-red-50 border-red-200 text-red-900',
            icon: 'text-red-600',
            button: 'border-red-300 text-red-900 hover:bg-red-100'
        }
    };
    const style = tones[tone];

    return (
        <div className={`flex flex-wrap items-center gap-3 rounded-lg border px-4 py-3 ${style.wrap}`}>
            <Icon className={`h-5 w-5 shrink-0 ${style.icon}`} />
            <div className="min-w-0 flex-1">
                <p className="font-semibold">{headline}</p>
                {detail && <p className="text-sm opacity-90">{detail}</p>}
            </div>
            <Button size="sm" variant="outline" onClick={onAction} className={`shrink-0 bg-white ${style.button}`}>
                {actionLabel}
                <ArrowRight className="ml-1 h-3.5 w-3.5" />
            </Button>
        </div>
    );
};

const TicketAlertBanners = ({ alerts, onShowUnassigned, onShowOverdue }) => {
    const { unassignedCount, overdueCount, worstDaysOverdue } = alerts;

    if (!unassignedCount && !overdueCount) return null;

    const plural = (n, word) => `${n} ${word}${n === 1 ? '' : 's'}`;

    return (
        <div className="mb-4 space-y-2">
            {unassignedCount > 0 && (
                <Banner
                    tone="amber"
                    Icon={UserPlus}
                    headline={`${plural(unassignedCount, 'ticket')} not assigned to anyone`}
                    detail="These still need to be assigned to a staff member."
                    actionLabel="Show them"
                    onAction={onShowUnassigned}
                />
            )}

            {overdueCount > 0 && (
                <Banner
                    tone="red"
                    Icon={AlarmClock}
                    headline={`${plural(overdueCount, 'ticket')} past the due date`}
                    detail={
                        worstDaysOverdue > 0
                            ? `The oldest is ${plural(worstDaysOverdue, 'day')} overdue.`
                            : undefined
                    }
                    actionLabel="Show them"
                    onAction={onShowOverdue}
                />
            )}
        </div>
    );
};

export default TicketAlertBanners;
