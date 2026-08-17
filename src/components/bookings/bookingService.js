// src/components/bookings/bookingService.js
//
// All writes for the booking system. Every operation that changes which times an
// asset is occupied goes through a single atomic multi-path update, so the
// database is never left holding half a booking.

import { ref, push, update, get } from 'firebase/database';
import { database } from '@/config/firebase';
import { slotKeysForRange } from './bookingUtils';

/** Thrown when the slot lock write is rejected - almost always a double-booking race. */
export class SlotConflictError extends Error {
    constructor(message = 'Someone just booked part of that time. Please pick another slot.') {
        super(message);
        this.name = 'SlotConflictError';
    }
}

// The rules reject a slot write when the slot already exists, which surfaces as a
// generic permission error. Anything else is a real permissions problem.
function translateWriteError(error) {
    const code = error?.code || '';
    const message = String(error?.message || '');
    if (code === 'PERMISSION_DENIED' || message.includes('PERMISSION_DENIED') || message.includes('permission_denied')) {
        return new SlotConflictError();
    }
    return error;
}

function requesterFrom(user) {
    return {
        uid: user.uid,
        email: user.email || '',
        name: user.displayName || user.email || 'Unknown'
    };
}

/**
 * Everyone who may sign off on this asset: the global override approvers
 * (Estate Manager and the Heads of Extramurals) plus anyone named on the asset.
 */
export async function getApproverUidsForAsset(assetId) {
    const [globalSnap, assetSnap] = await Promise.all([
        get(ref(database, 'bookingApprovers')),
        get(ref(database, `assets/${assetId}/approvers`))
    ]);

    const uids = new Set();
    if (globalSnap.exists()) {
        Object.entries(globalSnap.val()).forEach(([uid, v]) => { if (v) uids.add(uid); });
    }
    if (assetSnap.exists()) {
        Object.entries(assetSnap.val()).forEach(([uid, v]) => { if (v) uids.add(uid); });
    }
    return [...uids];
}

/**
 * Mirrors the security rule for approving a booking, exactly.
 *
 * Deliberately keyed on isDatabaseAdmin (a record at admins/{uid}) rather than
 * userRole: userRole can also come from the staff node, but the rules only ever
 * check admins/{uid}. Gating on userRole would render Approve buttons that the
 * database then rejects.
 */
export function canApprove({ uid, isDatabaseAdmin, asset, globalApprovers }) {
    if (!uid) return false;
    if (isDatabaseAdmin) return true;
    if (globalApprovers && globalApprovers[uid]) return true;
    if (asset?.approvers && asset.approvers[uid]) return true;
    return false;
}

/**
 * Drop a notification into each recipient's own inbox.
 *
 * Written to bookingNotifications/{uid}/ rather than the flat notifications node
 * the ticket system uses, so each person can only read their own, and so a
 * per-user query needs no index gymnastics.
 *
 * emailSent is left false; the Apps Script mailer picks those up and flips it.
 * See apps-script/bookingEmails.gs.
 */
async function notify(entries) {
    // Notifications are a side effect - a failure here must never lose a booking.
    try {
        const updates = {};
        entries.filter((e) => e.userId).forEach((entry) => {
            const { userId, ...rest } = entry;
            const key = push(ref(database, `bookingNotifications/${userId}`)).key;
            updates[`bookingNotifications/${userId}/${key}`] = {
                ...rest,
                read: false,
                emailSent: false,
                createdAt: new Date().toISOString()
            };
        });
        if (Object.keys(updates).length) await update(ref(database), updates);
    } catch (error) {
        console.error('Booking notification failed (booking itself is unaffected):', error);
    }
}

/**
 * Edit a booking's descriptive details.
 *
 * Deliberately cannot touch start, end, asset or status - the rules enforce that
 * too. A requester can correct or expand their reason at any time; moving a
 * booking in time stays with approvers and admins.
 */
export async function updateBookingDetails({ booking, reason, user }) {
    const trimmed = (reason || '').trim();
    if (!trimmed) {
        throw new Error('Please give a reason for the booking.');
    }
    if (trimmed === (booking.reason || '')) {
        return; // nothing changed
    }

    const now = new Date().toISOString();
    await update(ref(database, `bookings/${booking.id}`), {
        reason: trimmed,
        updatedAt: now,
        detailsEditedBy: {
            uid: user.uid,
            name: user.displayName || user.email || '',
            at: now
        }
    });

    // Let approvers know the brief changed while they were deciding.
    if (booking.status === 'pending') {
        const approverUids = await getApproverUidsForAsset(booking.assetId);
        await notify(approverUids
            .filter((uid) => uid !== user.uid)
            .map((uid) => ({
                userId: uid,
                type: 'booking_updated',
                title: 'Booking details changed',
                message: `${booking.requester?.name || 'A requester'} updated the reason for ${booking.assetName}`,
                bookingId: booking.id,
                assetId: booking.assetId
            })));
    }
}

/**
 * Request a booking.
 *
 * Writes the booking record and all of its slot locks in one atomic update. An
 * auto-approve asset lands as 'confirmed' immediately; a sign-off asset lands as
 * 'pending' but still holds its slots, so the time reads as taken straight away.
 */
export async function createBooking({ asset, start, end, reason, user }) {
    if (!asset || asset.status === 'retired') {
        throw new Error('That asset is not available for booking.');
    }
    if (!(end > start)) {
        throw new Error('The end time must be after the start time.');
    }
    // Matches the calendar, which only disables a slot once it has fully passed.
    if (end <= Date.now()) {
        throw new Error('That time has already passed.');
    }

    const status = asset.approvalMode === 'auto' ? 'confirmed' : 'pending';
    const bookingId = push(ref(database, 'bookings')).key;
    const keys = slotKeysForRange(start, end);
    const now = new Date().toISOString();

    const booking = {
        assetId: asset.id,
        assetName: asset.name,
        assetType: asset.type,
        start,
        end,
        startISO: new Date(start).toISOString(),
        endISO: new Date(end).toISOString(),
        reason: reason || '',
        requester: requesterFrom(user),
        requesterUid: user.uid,
        status,
        approvalMode: asset.approvalMode,
        slots: keys.reduce((acc, k) => ({ ...acc, [k]: true }), {}),
        createdAt: now,
        updatedAt: now
    };

    const updates = { [`bookings/${bookingId}`]: booking };
    keys.forEach((k) => { updates[`bookingSlots/${asset.id}/${k}`] = bookingId; });

    try {
        await update(ref(database), updates);
    } catch (error) {
        throw translateWriteError(error);
    }

    if (status === 'pending') {
        const approverUids = await getApproverUidsForAsset(asset.id);
        await notify(approverUids.map((uid) => ({
            userId: uid,
            userRole: 'approver',
            type: 'booking_pending',
            title: 'Booking needs sign-off',
            message: `${booking.requester.name} requested ${asset.name}`,
            bookingId,
            assetId: asset.id
        })));
    }

    return { id: bookingId, ...booking };
}

/** Confirm a pending booking. The slots are already held, so only status changes. */
export async function approveBooking({ booking, user, note = '' }) {
    const now = new Date().toISOString();
    await update(ref(database, `bookings/${booking.id}`), {
        status: 'confirmed',
        updatedAt: now,
        decision: {
            action: 'approved',
            by: user.uid,
            byEmail: user.email || '',
            byName: user.displayName || user.email || '',
            at: now,
            note
        }
    });

    await notify([{
        userId: booking.requester?.uid,
        userRole: 'requester',
        type: 'booking_approved',
        title: 'Booking approved',
        message: `${booking.assetName} is confirmed`,
        bookingId: booking.id,
        assetId: booking.assetId
    }]);
}

/** Decline a pending booking and release its slots in the same atomic write. */
export async function declineBooking({ booking, user, note = '' }) {
    const now = new Date().toISOString();
    const updates = {
        [`bookings/${booking.id}/status`]: 'declined',
        [`bookings/${booking.id}/updatedAt`]: now,
        [`bookings/${booking.id}/decision`]: {
            action: 'declined',
            by: user.uid,
            byEmail: user.email || '',
            byName: user.displayName || user.email || '',
            at: now,
            note
        }
    };
    releaseSlotsInto(updates, booking);

    await update(ref(database), updates);

    await notify([{
        userId: booking.requester?.uid,
        userRole: 'requester',
        type: 'booking_declined',
        title: 'Booking declined',
        message: `${booking.assetName}${note ? ` - ${note}` : ''}`,
        bookingId: booking.id,
        assetId: booking.assetId
    }]);
}

/** Cancel a booking (by the requester, an approver or an admin) and free the time. */
export async function cancelBooking({ booking, user, note = '' }) {
    const now = new Date().toISOString();
    const updates = {
        [`bookings/${booking.id}/status`]: 'cancelled',
        [`bookings/${booking.id}/updatedAt`]: now,
        [`bookings/${booking.id}/decision`]: {
            action: 'cancelled',
            by: user.uid,
            byEmail: user.email || '',
            byName: user.displayName || user.email || '',
            at: now,
            note
        }
    };
    releaseSlotsInto(updates, booking);

    await update(ref(database), updates);

    // Tell the requester only when somebody else cancelled on their behalf.
    if (booking.requester?.uid && booking.requester.uid !== user.uid) {
        await notify([{
            userId: booking.requester.uid,
            userRole: 'requester',
            type: 'booking_cancelled',
            title: 'Booking cancelled',
            message: `${booking.assetName}${note ? ` - ${note}` : ''}`,
            bookingId: booking.id,
            assetId: booking.assetId
        }]);
    }
}

/**
 * Move an existing booking to a new time.
 *
 * Releases only the slots being given up and claims only the newly needed ones,
 * so a small nudge does not briefly free the whole booking for someone else to
 * grab. Still a single atomic update: if any new slot is taken, nothing changes.
 */
export async function amendBooking({ booking, start, end, user, note = '' }) {
    if (!(end > start)) {
        throw new Error('The end time must be after the start time.');
    }

    const oldKeys = new Set(Object.keys(booking.slots || {}));
    const newKeys = slotKeysForRange(start, end);
    const newKeySet = new Set(newKeys);

    const now = new Date().toISOString();
    const updates = {
        [`bookings/${booking.id}/start`]: start,
        [`bookings/${booking.id}/end`]: end,
        [`bookings/${booking.id}/startISO`]: new Date(start).toISOString(),
        [`bookings/${booking.id}/endISO`]: new Date(end).toISOString(),
        [`bookings/${booking.id}/slots`]: newKeys.reduce((acc, k) => ({ ...acc, [k]: true }), {}),
        [`bookings/${booking.id}/updatedAt`]: now,
        [`bookings/${booking.id}/amendment`]: {
            by: user.uid,
            byEmail: user.email || '',
            byName: user.displayName || user.email || '',
            at: now,
            note,
            previousStart: booking.start,
            previousEnd: booking.end
        }
    };

    oldKeys.forEach((k) => {
        if (!newKeySet.has(k)) updates[`bookingSlots/${booking.assetId}/${k}`] = null;
    });
    newKeys.forEach((k) => {
        if (!oldKeys.has(k)) updates[`bookingSlots/${booking.assetId}/${k}`] = booking.id;
    });

    try {
        await update(ref(database), updates);
    } catch (error) {
        throw translateWriteError(error);
    }

    if (booking.requester?.uid && booking.requester.uid !== user.uid) {
        await notify([{
            userId: booking.requester.uid,
            userRole: 'requester',
            type: 'booking_amended',
            title: 'Booking time changed',
            message: `${booking.assetName}${note ? ` - ${note}` : ''}`,
            bookingId: booking.id,
            assetId: booking.assetId
        }]);
    }
}

/** Queue every slot this booking holds for deletion, into an update map. */
function releaseSlotsInto(updates, booking) {
    Object.keys(booking.slots || {}).forEach((k) => {
        updates[`bookingSlots/${booking.assetId}/${k}`] = null;
    });
}
