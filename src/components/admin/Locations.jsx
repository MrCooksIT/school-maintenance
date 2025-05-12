// src/components/admin/Locations.jsx - Fixed Version
import React, { useState, useEffect } from 'react';
import { ref, push, update, remove, onValue, get } from 'firebase/database';
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
    DialogHeader,
    DialogTitle,
    DialogDescription
} from "@/components/ui/dialog";
import {
    Building,
    PlusCircle,
    Edit,
    Trash2,
    MapPin,
    Building2,
    Loader
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
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
    const { toast } = useToast();

    // Load locations from Firebase
    useEffect(() => {
        console.log("Fetching locations from Firebase...");
        setIsLoading(true);
        setError(null);

        const locationsRef = ref(database, 'locations');
        const unsubscribe = onValue(locationsRef, (snapshot) => {
            if (snapshot.exists()) {
                const locationsData = Object.entries(snapshot.val()).map(([id, data]) => ({
                    id,
                    ...data
                }));
                console.log(`Fetched ${locationsData.length} locations`, locationsData);
                setLocations(locationsData);
            } else {
                console.log("No locations found in database");
                setLocations([]);
            }
            setIsLoading(false);
        }, (error) => {
            console.error("Error fetching locations:", error);
            setError("Failed to load locations. Please check your connection and try again.");
            setIsLoading(false);
        });

        return () => unsubscribe();
    }, []);

    // Add a new location
    const handleAddLocation = async () => {
        if (!newLocation.name.trim()) {
            toast({
                title: "Validation Error",
                description: "Location name is required",
                variant: "destructive"
            });
            return;
        }

        try {
            console.log("Adding new location:", newLocation);
            const locationsRef = ref(database, 'locations');

            // Verify database reference
            console.log("Database reference:", database);

            const locationData = {
                ...newLocation,
                createdAt: new Date().toISOString()
            };

            const newLocationRef = await push(locationsRef, locationData);
            console.log("Location added with ID:", newLocationRef.key);

            // Clear form and close dialog
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
                description: "Failed to add location: " + error.message,
                variant: "destructive"
            });
        }
    };

    // Edit an existing location
    const handleEditLocation = async () => {
        if (!editingLocation || !editingLocation.name.trim()) {
            toast({
                title: "Validation Error",
                description: "Location name is required",
                variant: "destructive"
            });
            return;
        }

        try {
            console.log("Updating location:", editingLocation);
            const locationRef = ref(database, `locations/${editingLocation.id}`);

            await update(locationRef, {
                ...editingLocation,
                updatedAt: new Date().toISOString()
            });

            console.log("Location updated successfully");
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
                description: "Failed to update location: " + error.message,
                variant: "destructive"
            });
        }
    };

    // Delete a location
    const handleDeleteLocation = async (locationId) => {
        try {
            const confirmDelete = window.confirm('Are you sure you want to delete this location?');
            if (!confirmDelete) return;

            console.log("Deleting location:", locationId);
            const locationRef = ref(database, `locations/${locationId}`);

            // Verify the location exists before deleting
            const snapshot = await get(locationRef);
            if (!snapshot.exists()) {
                console.error("Location not found:", locationId);
                toast({
                    title: "Error",
                    description: "Location not found",
                    variant: "destructive"
                });
                return;
            }

            await remove(locationRef);
            console.log("Location deleted successfully");

            toast({
                title: "Location Deleted",
                description: "Location has been deleted successfully",
                variant: "success"
            });
        } catch (error) {
            console.error('Error deleting location:', error);
            toast({
                title: "Error",
                description: "Failed to delete location: " + error.message,
                variant: "destructive"
            });
        }
    };

    // Open the edit dialog
    const openEditModal = (location) => {
        console.log("Opening edit modal for location:", location);
        setEditingLocation(location);
        setIsEditDialogOpen(true);
    };

    // If loading or error, show appropriate message
    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-64">
                <Loader className="h-8 w-8 animate-spin text-blue-500" />
                <span className="ml-2">Loading locations...</span>
            </div>
        );
    }

    if (error) {
        return (
            <div className="p-6 text-center">
                <div className="bg-red-50 text-red-700 p-4 rounded-lg mb-4">
                    {error}
                </div>
                <Button onClick={() => window.location.reload()}>
                    Try Again
                </Button>
            </div>
        );
    }

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
                {locations.length === 0 ? (
                    <div className="col-span-full text-center p-8 bg-gray-50 border rounded-lg">
                        <MapPin className="h-12 w-12 mx-auto text-gray-400 mb-2" />
                        <p className="text-gray-500">No locations added yet. Create your first location to get started.</p>
                    </div>
                ) : (
                    locations.map((location) => (
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
                                            onClick={() => openEditModal(location)}
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
                    ))
                )}
            </div>

            {/* Add Location Dialog */}
            <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
                <DialogContent className="sm:max-w-[550px] p-6">
                    <DialogHeader className="mb-4">
                        <DialogTitle>Add New Location</DialogTitle>
                        <DialogDescription>
                            Add a new maintenance location
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Name *</label>
                            <Input
                                placeholder="Location name"
                                value={newLocation.name}
                                onChange={(e) => setNewLocation(prev => ({ ...prev, name: e.target.value }))}
                                required
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Building</label>
                            <Input
                                placeholder="Building"
                                value={newLocation.building}
                                onChange={(e) => setNewLocation(prev => ({ ...prev, building: e.target.value }))}
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Floor</label>
                            <Input
                                placeholder="Floor"
                                value={newLocation.floor}
                                onChange={(e) => setNewLocation(prev => ({ ...prev, floor: e.target.value }))}
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Type</label>
                            <Input
                                placeholder="Location type (e.g., Classroom, Office, Lab)"
                                value={newLocation.type}
                                onChange={(e) => setNewLocation(prev => ({ ...prev, type: e.target.value }))}
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Description</label>
                            <Input
                                placeholder="Description"
                                value={newLocation.description}
                                onChange={(e) => setNewLocation(prev => ({ ...prev, description: e.target.value }))}
                            />
                        </div>
                    </div>
                    <div className="flex justify-end gap-2 pt-4">
                        <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                            Cancel
                        </Button>
                        <Button onClick={handleAddLocation}>
                            Add Location
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>

            {/* Edit Location Dialog */}
            <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
                <DialogContent className="sm:max-w-[550px] p-6">
                    <DialogHeader className="mb-4">
                        <DialogTitle>Edit Location</DialogTitle>
                        <DialogDescription>
                            Update location details
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Name *</label>
                            <Input
                                placeholder="Location name"
                                value={editingLocation?.name || ''}
                                onChange={(e) => setEditingLocation(prev => prev ? { ...prev, name: e.target.value } : null)}
                                required
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Building</label>
                            <Input
                                placeholder="Building"
                                value={editingLocation?.building || ''}
                                onChange={(e) => setEditingLocation(prev => prev ? { ...prev, building: e.target.value } : null)}
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Floor</label>
                            <Input
                                placeholder="Floor"
                                value={editingLocation?.floor || ''}
                                onChange={(e) => setEditingLocation(prev => prev ? { ...prev, floor: e.target.value } : null)}
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Type</label>
                            <Input
                                placeholder="Location type (e.g., Classroom, Office, Lab)"
                                value={editingLocation?.type || ''}
                                onChange={(e) => setEditingLocation(prev => prev ? { ...prev, type: e.target.value } : null)}
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Description</label>
                            <Input
                                placeholder="Description"
                                value={editingLocation?.description || ''}
                                onChange={(e) => setEditingLocation(prev => prev ? { ...prev, description: e.target.value } : null)}
                            />
                        </div>
                    </div>
                    <div className="flex justify-end gap-2 pt-4">
                        <Button variant="outline" onClick={() => {
                            setEditingLocation(null);
                            setIsEditDialogOpen(false);
                        }}>
                            Cancel
                        </Button>
                        <Button onClick={handleEditLocation}>
                            Update Location
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
};

export default Locations;