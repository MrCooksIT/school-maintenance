// src/components/bookings/AssetsManager.jsx
//
// Admin CRUD for bookable assets, plus the per-asset approver assignment.
// Follows the same shape as admin/Locations.jsx so it reads as part of the
// same app rather than a bolted-on tool.

import React, { useState, useMemo } from 'react';
import { ref, push, update } from 'firebase/database';
import { database } from '@/config/firebase';
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription
} from '@/components/ui/dialog';
import {
    PlusCircle,
    Edit,
    Archive,
    RotateCcw,
    Loader,
    DoorOpen,
    Car,
    Package,
    ShieldCheck,
    Zap,
    Users
} from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { useAssets, useUsers, useGlobalApprovers } from './useBookingData';
import { DEFAULT_HOURS } from './bookingUtils';

const TYPES = [
    { value: 'room', label: 'Room', icon: DoorOpen },
    { value: 'vehicle', label: 'Vehicle', icon: Car },
    { value: 'equipment', label: 'Equipment', icon: Package }
];

const emptyAsset = {
    name: '',
    type: 'room',
    description: '',
    capacity: '',
    approvalMode: 'auto',
    approvers: {},
    status: 'active',
    hours: { ...DEFAULT_HOURS }
};

const AssetsManager = () => {
    const { assets, loading } = useAssets();
    const { users } = useUsers();
    const { approvers: globalApprovers } = useGlobalApprovers();
    const { toast } = useToast();

    const [dialogOpen, setDialogOpen] = useState(false);
    const [draft, setDraft] = useState(emptyAsset);
    const [editingId, setEditingId] = useState(null);
    const [saving, setSaving] = useState(false);
    const [showRetired, setShowRetired] = useState(false);

    const visible = useMemo(
        () => assets.filter((a) => (showRetired ? a.status === 'retired' : a.status !== 'retired')),
        [assets, showRetired]
    );

    const userName = (uid) => {
        const u = users.find((x) => x.id === uid);
        return u?.name || u?.email || uid;
    };

    const openAdd = () => {
        setDraft({ ...emptyAsset, approvers: {} });
        setEditingId(null);
        setDialogOpen(true);
    };

    const openEdit = (asset) => {
        setDraft({
            ...emptyAsset,
            ...asset,
            hours: { ...DEFAULT_HOURS, ...(asset.hours || {}) },
            approvers: asset.approvers || {}
        });
        setEditingId(asset.id);
        setDialogOpen(true);
    };

    const toggleApprover = (uid) => {
        setDraft((prev) => {
            const next = { ...(prev.approvers || {}) };
            if (next[uid]) delete next[uid];
            else next[uid] = true;
            return { ...prev, approvers: next };
        });
    };

    const handleSave = async () => {
        if (!draft.name.trim()) {
            toast({ title: 'Name required', description: 'Give the asset a name.', variant: 'destructive' });
            return;
        }

        setSaving(true);
        try {
            const payload = {
                name: draft.name.trim(),
                type: draft.type,
                description: draft.description || '',
                capacity: draft.capacity || '',
                approvalMode: draft.approvalMode,
                approvers: draft.approvers || {},
                status: draft.status || 'active',
                hours: draft.hours || DEFAULT_HOURS,
                updatedAt: new Date().toISOString()
            };

            if (editingId) {
                await update(ref(database, `assets/${editingId}`), payload);
            } else {
                await push(ref(database, 'assets'), { ...payload, createdAt: new Date().toISOString() });
            }

            setDialogOpen(false);
            toast({
                title: editingId ? 'Asset updated' : 'Asset added',
                description: `${payload.name} saved.`,
                variant: 'success'
            });
        } catch (error) {
            console.error('Error saving asset:', error);
            toast({ title: 'Error', description: `Could not save: ${error.message}`, variant: 'destructive' });
        } finally {
            setSaving(false);
        }
    };

    // Assets are retired, never deleted - existing bookings still point at them.
    const setStatus = async (asset, status) => {
        try {
            await update(ref(database, `assets/${asset.id}`), { status, updatedAt: new Date().toISOString() });
            toast({
                title: status === 'retired' ? 'Asset retired' : 'Asset restored',
                description: `${asset.name} is now ${status}.`,
                variant: 'success'
            });
        } catch (error) {
            toast({ title: 'Error', description: error.message, variant: 'destructive' });
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <Loader className="h-8 w-8 animate-spin text-blue-500" />
                <span className="ml-2">Loading assets...</span>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
                <h1 className="text-2xl font-bold">Bookable assets</h1>
                <div className="flex gap-2">
                    <Button variant="outline" onClick={() => setShowRetired((v) => !v)}>
                        {showRetired ? 'Show active' : 'Show retired'}
                    </Button>
                    <Button onClick={openAdd}>
                        <PlusCircle className="h-4 w-4 mr-2" />
                        Add asset
                    </Button>
                </div>
            </div>

            {Object.keys(globalApprovers || {}).length === 0 && (
                <div className="rounded-lg bg-amber-50 p-4 text-sm text-amber-800">
                    No global approvers are set yet, so only admins can sign off bookings.
                    Set the Estate Manager and the Heads of Extramurals under{' '}
                    <span className="font-medium">Booking approvers</span>.
                </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {visible.length === 0 ? (
                    <div className="col-span-full rounded-lg border bg-gray-50 p-8 text-center">
                        <Package className="h-12 w-12 mx-auto text-gray-400 mb-2" />
                        <p className="text-gray-500">
                            {showRetired ? 'No retired assets.' : 'No assets yet. Add your first room, vehicle or piece of equipment.'}
                        </p>
                    </div>
                ) : (
                    visible.map((asset) => {
                        const TypeIcon = TYPES.find((t) => t.value === asset.type)?.icon || Package;
                        const assetApprovers = Object.keys(asset.approvers || {});

                        return (
                            <Card key={asset.id}>
                                <CardHeader>
                                    <div className="flex items-start justify-between gap-2">
                                        <div className="min-w-0 space-y-1">
                                            <CardTitle className="truncate">{asset.name}</CardTitle>
                                            <CardDescription>
                                                <span className="flex items-center gap-2">
                                                    <TypeIcon className="h-4 w-4" />
                                                    {TYPES.find((t) => t.value === asset.type)?.label || asset.type}
                                                    {asset.capacity && ` · capacity ${asset.capacity}`}
                                                </span>
                                            </CardDescription>
                                        </div>
                                        <div className="flex shrink-0 gap-1">
                                            <Button variant="ghost" size="icon" onClick={() => openEdit(asset)} aria-label="Edit">
                                                <Edit className="h-4 w-4" />
                                            </Button>
                                            {asset.status === 'retired' ? (
                                                <Button variant="ghost" size="icon" onClick={() => setStatus(asset, 'active')} aria-label="Restore">
                                                    <RotateCcw className="h-4 w-4 text-emerald-600" />
                                                </Button>
                                            ) : (
                                                <Button variant="ghost" size="icon" onClick={() => setStatus(asset, 'retired')} aria-label="Retire">
                                                    <Archive className="h-4 w-4 text-amber-600" />
                                                </Button>
                                            )}
                                        </div>
                                    </div>
                                </CardHeader>
                                <CardContent className="space-y-3">
                                    <div className="flex flex-wrap gap-2">
                                        {asset.approvalMode === 'auto' ? (
                                            <Badge className="bg-emerald-100 text-emerald-800 hover:bg-emerald-100">
                                                <Zap className="h-3 w-3 mr-1" /> Auto-approve
                                            </Badge>
                                        ) : (
                                            <Badge className="bg-amber-100 text-amber-900 hover:bg-amber-100">
                                                <ShieldCheck className="h-3 w-3 mr-1" /> Needs sign-off
                                            </Badge>
                                        )}
                                        {asset.status === 'retired' && (
                                            <Badge variant="secondary">Retired</Badge>
                                        )}
                                    </div>

                                    {asset.approvalMode === 'signoff' && (
                                        <p className="flex items-start gap-1.5 text-xs text-gray-600">
                                            <Users className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                                            {assetApprovers.length > 0
                                                ? assetApprovers.map(userName).join(', ')
                                                : 'Global approvers only'}
                                        </p>
                                    )}

                                    <p className="text-sm text-gray-600">
                                        {asset.description || 'No description'}
                                    </p>
                                    <p className="text-xs text-gray-400">
                                        Bookable {asset.hours?.dayStart || DEFAULT_HOURS.dayStart}-{asset.hours?.dayEnd || DEFAULT_HOURS.dayEnd}
                                    </p>
                                </CardContent>
                            </Card>
                        );
                    })
                )}
            </div>

            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogContent className="sm:max-w-[560px] p-6 max-h-[90vh] overflow-y-auto">
                    <DialogHeader className="mb-2">
                        <DialogTitle>{editingId ? 'Edit asset' : 'Add asset'}</DialogTitle>
                        <DialogDescription>
                            Rooms, vehicles and equipment that staff can book.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4 py-2">
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Name *</label>
                            <Input
                                placeholder="e.g. Minibus 1, Laptop Trolley A, Hall"
                                value={draft.name}
                                onChange={(e) => setDraft((p) => ({ ...p, name: e.target.value }))}
                            />
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium">Type</label>
                            <div className="flex gap-2">
                                {TYPES.map(({ value, label, icon: Icon }) => (
                                    <button
                                        key={value}
                                        type="button"
                                        onClick={() => setDraft((p) => ({ ...p, type: value }))}
                                        className={`flex flex-1 items-center justify-center gap-1.5 rounded-md border px-3 py-2 text-sm ${draft.type === value
                                            ? 'border-marist bg-marist/5 font-medium text-marist'
                                            : 'bg-white text-gray-600 hover:bg-gray-50'
                                            }`}
                                    >
                                        <Icon className="h-4 w-4" />
                                        {label}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Bookable from</label>
                                <Input
                                    type="time"
                                    value={draft.hours?.dayStart || DEFAULT_HOURS.dayStart}
                                    onChange={(e) => setDraft((p) => ({ ...p, hours: { ...p.hours, dayStart: e.target.value } }))}
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Bookable until</label>
                                <Input
                                    type="time"
                                    value={draft.hours?.dayEnd || DEFAULT_HOURS.dayEnd}
                                    onChange={(e) => setDraft((p) => ({ ...p, hours: { ...p.hours, dayEnd: e.target.value } }))}
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium">Capacity / quantity</label>
                            <Input
                                placeholder="e.g. 22 seats, 30 laptops"
                                value={draft.capacity}
                                onChange={(e) => setDraft((p) => ({ ...p, capacity: e.target.value }))}
                            />
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium">Description</label>
                            <Input
                                placeholder="Anything staff should know before booking"
                                value={draft.description}
                                onChange={(e) => setDraft((p) => ({ ...p, description: e.target.value }))}
                            />
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium">Approval</label>
                            <div className="flex gap-2">
                                <button
                                    type="button"
                                    onClick={() => setDraft((p) => ({ ...p, approvalMode: 'auto' }))}
                                    className={`flex-1 rounded-md border px-3 py-2 text-sm ${draft.approvalMode === 'auto'
                                        ? 'border-emerald-500 bg-emerald-50 font-medium text-emerald-800'
                                        : 'bg-white text-gray-600 hover:bg-gray-50'
                                        }`}
                                >
                                    <Zap className="mr-1 inline h-4 w-4" />
                                    Auto-approve
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setDraft((p) => ({ ...p, approvalMode: 'signoff' }))}
                                    className={`flex-1 rounded-md border px-3 py-2 text-sm ${draft.approvalMode === 'signoff'
                                        ? 'border-amber-500 bg-amber-50 font-medium text-amber-900'
                                        : 'bg-white text-gray-600 hover:bg-gray-50'
                                        }`}
                                >
                                    <ShieldCheck className="mr-1 inline h-4 w-4" />
                                    Needs sign-off
                                </button>
                            </div>
                        </div>

                        {draft.approvalMode === 'signoff' && (
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Approvers for this asset</label>
                                <p className="text-xs text-gray-500">
                                    Global approvers can always sign off. Add anyone extra here.
                                </p>
                                <div className="max-h-44 space-y-1 overflow-y-auto rounded-md border p-2">
                                    {users.length === 0 ? (
                                        <p className="p-2 text-xs text-gray-400">
                                            Nobody has signed in yet, so there is nobody to pick.
                                        </p>
                                    ) : (
                                        users.map((u) => (
                                            <label key={u.id} className="flex cursor-pointer items-center gap-2 rounded p-1.5 text-sm hover:bg-gray-50">
                                                <input
                                                    type="checkbox"
                                                    checked={!!draft.approvers?.[u.id]}
                                                    onChange={() => toggleApprover(u.id)}
                                                    className="h-4 w-4"
                                                />
                                                <span className="truncate">
                                                    {u.name || u.email}
                                                    {globalApprovers?.[u.id] && (
                                                        <span className="ml-1 text-xs text-blue-600">(global)</span>
                                                    )}
                                                </span>
                                            </label>
                                        ))
                                    )}
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="flex justify-end gap-2 pt-4">
                        <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={saving}>
                            Cancel
                        </Button>
                        <Button onClick={handleSave} disabled={saving}>
                            {saving && <Loader className="mr-2 h-4 w-4 animate-spin" />}
                            {editingId ? 'Save changes' : 'Add asset'}
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
};

export default AssetsManager;
