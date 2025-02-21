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
    DialogTrigger,
} from "@/components/ui/dialog";
import {
    Building,
    PlusCircle,
    Edit,
    Trash2,
    MapPin,
    Building2
} from 'lucide-react';

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
        try {
            const locationsRef = ref(database, 'locations');
            await push(locationsRef, {
                ...newLocation,
                createdAt: new Date().toISOString()
            });
            setNewLocation({ name: '', building: '', floor: '', description: '', type: '' });
            setIsAddDialogOpen(false);
        } catch (error) {
            console.error('Error adding location:', error);
        }
    };

    const handleEditLocation = async () => {
        if (!editingLocation) return;
        try {
            const locationRef = ref(database, `locations/${editingLocation.id}`);
            await update(locationRef, {
                ...editingLocation,
                updatedAt: new Date().toISOString()
            });
            setEditingLocation(null);
            setIsEditDialogOpen(false);
        } catch (error) {
            console.error('Error updating location:', error);
        }
    };

    const handleDeleteLocation = async (locationId) => {
        if (!window.confirm('Are you sure you want to delete this location?')) return;
        try {
            await remove(ref(database, `locations/${locationId}`));
        } catch (error) {
            console.error('Error deleting location:', error);
        }
    };

    const LocationDialog = ({ isOpen, onOpenChange, location, onSave, isEditing = false }) => (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>{isEditing ? 'Edit Location' : 'Add New Location'}</DialogTitle>
                    <DialogDescription>
                        {isEditing ? 'Update location details' : 'Add a new maintenance location'}
                    </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                    <div className="space-y-2">
                        <label>Name</label>
                        <Input
                            placeholder="Location name"
                            value={isEditing ? location?.name : newLocation.name}
                            onChange={(e) => isEditing
                                ? setEditingLocation(prev => ({ ...prev, name: e.target.value }))
                                : setNewLocation(prev => ({ ...prev, name: e.target.value }))
                            }
                        />
                    </div>
                    <div className="space-y-2">
                        <label>Building</label>
                        <Input
                            placeholder="Building"
                            value={isEditing ? location?.building : newLocation.building}
                            onChange={(e) => isEditing
                                ? setEditingLocation(prev => ({ ...prev, building: e.target.value }))
                                : setNewLocation(prev => ({ ...prev, building: e.target.value }))
                            }
                        />
                    </div>
                    <div className="space-y-2">
                        <label>Floor</label>
                        <Input
                            placeholder="Floor"
                            value={isEditing ? location?.floor : newLocation.floor}
                            onChange={(e) => isEditing
                                ? setEditingLocation(prev => ({ ...prev, floor: e.target.value }))
                                : setNewLocation(prev => ({ ...prev, floor: e.target.value }))
                            }
                        />
                    </div>
                    <div className="space-y-2">
                        <label>Type</label>
                        <Input
                            placeholder="Location type"
                            value={isEditing ? location?.type : newLocation.type}
                            onChange={(e) => isEditing
                                ? setEditingLocation(prev => ({ ...prev, type: e.target.value }))
                                : setNewLocation(prev => ({ ...prev, type: e.target.value }))
                            }
                        />
                    </div>
                    <div className="space-y-2">
                        <label>Description</label>
                        <Input
                            placeholder="Description"
                            value={isEditing ? location?.description : newLocation.description}
                            onChange={(e) => isEditing
                                ? setEditingLocation(prev => ({ ...prev, description: e.target.value }))
                                : setNewLocation(prev => ({ ...prev, description: e.target.value }))
                            }
                        />
                    </div>
                </div>
                <div className="flex justify-end gap-2">
                    <Button variant="outline" onClick={() => onOpenChange(false)}>
                        Cancel
                    </Button>
                    <Button onClick={onSave}>
                        {isEditing ? 'Update Location' : 'Add Location'}
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );

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