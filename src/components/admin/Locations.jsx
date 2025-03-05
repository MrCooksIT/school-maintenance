// src/components/admin/Locations.jsx
import React, { useState, useEffect } from 'react';
import { ref, push, update, remove, onValue } from 'firebase/database';
import { database } from '@/config/firebase';
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import {
    Building,
    PlusCircle,
    Edit,
    Trash2,
    MapPin,
    Building2
} from 'lucide-react';
import { useToast } from "@/components/ui/use-toast";

const Locations = () => {
    const [locations, setLocations] = useState([]);
    const [newLocation, setNewLocation] = useState({
        name: '',
        building: '',
        floor: '',
        description: '',
        type: ''
    });
    const [editingLocation, setEditingLocation] = useState(null);
    const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
    const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
    const { toast } = useToast();

    useEffect(() => {
        const locationsRef = ref(database, 'locations');
        const unsubscribe = onValue(locationsRef, (snapshot) => {
            if (snapshot.exists()) {
                const locationsData = Object.entries(snapshot.val()).map(([id, data]) => ({
                    id,
                    ...data,
                }));
                setLocations(locationsData);
            } else {
                setLocations([]);
            }
        });

        return () => unsubscribe();
    }, []);

    const handleAddLocation = async () => {
        if (!newLocation.name) {
            toast({
                title: "Validation Error",
                description: "Location name is required",
                variant: "destructive"
            });
            return;
        }

        try {
            const locationsRef = ref(database, 'locations');
            await push(locationsRef, {
                ...newLocation,
                createdAt: new Date().toISOString()
            });
            setNewLocation({ name: '', building: '', floor: '', description: '', type: '' });
            setIsAddDialogOpen(false);

            toast({
                title: "Location Added",
                description: `${newLocation.name} has been added successfully`,
                variant: "success"
            });
        } catch (error) {
            console.error('Error adding location:', error);
            toast({
                title: "Error",
                description: "Failed to add location",
                variant: "destructive"
            });
        }
    };

    const handleEditLocation = async () => {
        if (!editingLocation) return;

        if (!editingLocation.name) {
            toast({
                title: "Validation Error",
                description: "Location name is required",
                variant: "destructive"
            });
            return;
        }

        try {
            const locationRef = ref(database, `locations/${editingLocation.id}`);
            await update(locationRef, {
                ...editingLocation,
                updatedAt: new Date().toISOString()
            });
            setEditingLocation(null);
            setIsEditDialogOpen(false);

            toast({
                title: "Location Updated",
                description: `${editingLocation.name} has been updated successfully`,
                variant: "success"
            });
        } catch (error) {
            console.error('Error updating location:', error);
            toast({
                title: "Error",
                description: "Failed to update location",
                variant: "destructive"
            });
        }
    };

    const handleDeleteLocation = async (locationId) => {
        // Find the location name for the toast notification
        const locationToDelete = locations.find(loc => loc.id === locationId);

        try {
            // Use ConfirmationDialog instead of the built-in confirm
            const confirmDelete = window.confirm('Are you sure you want to delete this location?');
            if (!confirmDelete) return;

            await remove(ref(database, `locations/${locationId}`));

            toast({
                title: "Location Deleted",
                description: locationToDelete ? `${locationToDelete.name} has been deleted` : "Location has been deleted",
                variant: "success"
            });
        } catch (error) {
            console.error('Error deleting location:', error);
            toast({
                title: "Error",
                description: "Failed to delete location",
                variant: "destructive"
            });
        }
    };

    // LocationDialog component with local state for form control
    const LocationDialog = ({ isOpen, onOpenChange, location, onSave, isEditing = false }) => {
        // Create local state for form inputs
        const [formData, setFormData] = useState({
            name: '',
            building: '',
            floor: '',
            type: '',
            description: ''
        });

        // Initialize form data when the dialog opens or location changes
        useEffect(() => {
            if (isEditing && location) {
                setFormData({
                    name: location.name || '',
                    building: location.building || '',
                    floor: location.floor || '',
                    type: location.type || '',
                    description: location.description || ''
                });
            } else {
                setFormData({
                    name: '',
                    building: '',
                    floor: '',
                    type: '',
                    description: ''
                });
            }
        }, [isOpen, location, isEditing]);

        // Handle form submission
        const handleSubmit = () => {
            if (isEditing) {
                setEditingLocation({
                    ...location,
                    ...formData
                });
            } else {
                setNewLocation(formData);
            }
            onSave();
        };

        return (
            <Dialog open={isOpen} onOpenChange={onOpenChange}>
                <DialogContent className="sm:max-w-[550px] p-6">
                    <DialogHeader className="mb-4">
                        <DialogTitle>{isEditing ? 'Edit Location' : 'Add New Location'}</DialogTitle>
                        <DialogDescription>
                            {isEditing ? 'Update location details' : 'Add a new maintenance location'}
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Name</label>
                            <Input
                                placeholder="Location name"
                                value={formData.name}
                                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Building</label>
                            <Input
                                placeholder="Building"
                                value={formData.building}
                                onChange={(e) => setFormData(prev => ({ ...prev, building: e.target.value }))}
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Floor</label>
                            <Input
                                placeholder="Floor"
                                value={formData.floor}
                                onChange={(e) => setFormData(prev => ({ ...prev, floor: e.target.value }))}
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Type</label>
                            <Input
                                placeholder="Location type (e.g., Classroom, Office, Lab)"
                                value={formData.type}
                                onChange={(e) => setFormData(prev => ({ ...prev, type: e.target.value }))}
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Description</label>
                            <Input
                                placeholder="Description"
                                value={formData.description}
                                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                            />
                        </div>
                    </div>
                    <div className="flex justify-end gap-2 pt-4">
                        <Button variant="outline" onClick={() => onOpenChange(false)}>
                            Cancel
                        </Button>
                        <Button onClick={handleSubmit}>
                            {isEditing ? 'Update Location' : 'Add Location'}
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>
        );
    };

    return (
        <div className="p-6 space-y-6">
            <div className="flex items-center justify-between">
                <h1 className="text-2xl font-bold">Maintenance Locations</h1>
                <Button onClick={() => setIsAddDialogOpen(true)}>
                    <PlusCircle className="h-4 w-4 mr-2" />
                    Add Location
                </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {locations.map((location) => (
                    <Card key={location.id}>
                        <CardHeader>
                            <div className="flex items-start justify-between">
                                <div className="space-y-1">
                                    <CardTitle>{location.name}</CardTitle>
                                    <CardDescription>
                                        <div className="flex items-center gap-2">
                                            <Building2 className="h-4 w-4" />
                                            {location.building}
                                            {location.floor && ` - Floor ${location.floor}`}
                                        </div>
                                    </CardDescription>
                                </div>
                                <div className="flex gap-2">
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={() => {
                                            setEditingLocation(location);
                                            setIsEditDialogOpen(true);
                                        }}
                                    >
                                        <Edit className="h-4 w-4" />
                                    </Button>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={() => handleDeleteLocation(location.id)}
                                    >
                                        <Trash2 className="h-4 w-4 text-red-500" />
                                    </Button>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-2">
                                <div className="flex items-center gap-2 text-sm text-gray-500">
                                    <MapPin className="h-4 w-4" />
                                    {location.type || 'General Area'}
                                </div>
                                <p className="text-sm">
                                    {location.description || 'No description provided'}
                                </p>
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>

            <LocationDialog
                isOpen={isAddDialogOpen}
                onOpenChange={setIsAddDialogOpen}
                onSave={handleAddLocation}
            />

            <LocationDialog
                isOpen={isEditDialogOpen}
                onOpenChange={setIsEditDialogOpen}
                location={editingLocation}
                onSave={handleEditLocation}
                isEditing
            />
        </div>
    );
};

export default Locations;