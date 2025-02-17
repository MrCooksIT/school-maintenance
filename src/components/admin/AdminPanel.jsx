// src/components/admin/AdminPanel.jsx
import React, { useState } from 'react';
import { ref, update, remove, push } from 'firebase/database';
import { database } from '@/config/firebase';
import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
    SheetTrigger,
} from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Settings, Users, Activity, Building } from 'lucide-react';
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";

export function AdminPanel() {
    const [currentStaff, setCurrentStaff] = useState([
        { id: 'staff1', name: 'Jonathan Charles', department: 'Maintenance', activeTickets: 3 },
        { id: 'staff2', name: 'Tyler', department: 'IT', activeTickets: 1 },
        { id: 'staff3', name: 'Ebbie', department: 'Electrical', activeTickets: 2 }
    ]);

    const [newStaff, setNewStaff] = useState({
        name: '',
        department: '',
        email: ''
    });

    const [locations, setLocations] = useState([
        { id: 'loc1', name: 'Building A' },
        { id: 'loc2', name: 'Building B' },
        { id: 'loc3', name: 'Sports Field' }
    ]);

    const handleAddStaff = async () => {
        if (!newStaff.name || !newStaff.department) return;

        try {
            const staffRef = ref(database, 'staff');
            await push(staffRef, {
                ...newStaff,
                activeTickets: 0,
                createdAt: new Date().toISOString()
            });
            setNewStaff({ name: '', department: '', email: '' });
        } catch (error) {
            console.error('Error adding staff:', error);
        }
    };

    const handleRemoveStaff = async (staffId) => {
        if (!window.confirm('Are you sure you want to remove this staff member?')) return;

        try {
            await remove(ref(database, `staff/${staffId}`));
        } catch (error) {
            console.error('Error removing staff:', error);
        }
    };

    return (
        <Sheet>
            <SheetTrigger asChild>
                <Button variant="outline" size="icon">
                    <Settings className="h-4 w-4" />
                </Button>
            </SheetTrigger>
            <SheetContent className="w-[400px] sm:w-[540px] bg-[#0a1e46] text-white h-screen overflow-y-auto p-6">
                <SheetHeader>
                    <SheetTitle className="text-white">System Management</SheetTitle>
                </SheetHeader>

                <Tabs defaultValue="staff" className="mt-6">
                    <TabsList className="grid w-full grid-cols-3 bg-[#0f2a5e]">
                        <TabsTrigger
                            value="staff"
                            className="text-gray-300 data-[state=active]:bg-[#0a1e46] data-[state=active]:text-white"
                        >
                            <Users className="h-4 w-4 mr-2" />
                            Staff
                        </TabsTrigger>
                        <TabsTrigger
                            value="workload"
                            className="text-gray-300 data-[state=active]:bg-[#0a1e46] data-[state=active]:text-white"
                        >
                            <Activity className="h-4 w-4 mr-2" />
                            Workload
                        </TabsTrigger>
                        <TabsTrigger
                            value="locations"
                            className="text-gray-300 data-[state=active]:bg-[#0a1e46] data-[state=active]:text-white"
                        >
                            <Building className="h-4 w-4 mr-2" />
                            Locations
                        </TabsTrigger>
                    </TabsList>

                    <TabsContent value="staff" className="space-y-4 mt-4">
                        <Card className="bg-[#0f2a5e] border-gray-700">
                            <CardHeader>
                                <CardTitle className="text-white">Add Staff Member</CardTitle>
                                <CardDescription className="text-gray-300">
                                    Add new maintenance staff to the system
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="space-y-2">
                                    <Input
                                        placeholder="Name"
                                        value={newStaff.name}
                                        onChange={(e) => setNewStaff(prev => ({ ...prev, name: e.target.value }))}
                                        className="bg-[#0a1e46] border-gray-700 text-white placeholder:text-gray-400"
                                    />
                                    <Input
                                        placeholder="Department"
                                        value={newStaff.department}
                                        onChange={(e) => setNewStaff(prev => ({ ...prev, department: e.target.value }))}
                                        className="bg-[#0a1e46] border-gray-700 text-white placeholder:text-gray-400"
                                    />
                                    <Input
                                        placeholder="Email"
                                        type="email"
                                        value={newStaff.email}
                                        onChange={(e) => setNewStaff(prev => ({ ...prev, email: e.target.value }))}
                                        className="bg-[#0a1e46] border-gray-700 text-white placeholder:text-gray-400"
                                    />
                                    <Button onClick={handleAddStaff} className="w-full bg-blue-600 hover:bg-blue-700">
                                        Add Staff Member
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>

                        <Card className="bg-[#0f2a5e] border-gray-700">
                            <CardHeader>
                                <CardTitle className="text-white">Current Staff</CardTitle>
                                <CardDescription className="text-gray-300">
                                    Manage existing staff members
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-2">
                                    {currentStaff.map((staff) => (
                                        <div
                                            key={staff.id}
                                            className="flex items-center justify-between p-2 border border-gray-700 rounded-lg bg-[#0a1e46]"
                                        >
                                            <div>
                                                <p className="font-medium text-white">{staff.name}</p>
                                                <p className="text-sm text-gray-300">{staff.department}</p>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <span className="text-sm text-gray-300">
                                                    {staff.activeTickets} active tickets
                                                </span>
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => handleRemoveStaff(staff.id)}
                                                    className="text-red-400 hover:text-red-300 hover:bg-red-900/20"
                                                >
                                                    Remove
                                                </Button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </CardContent>
                        </Card>
                    </TabsContent>

                    <TabsContent value="workload">
                        <Card className="bg-[#0f2a5e] border-gray-700">
                            <CardHeader>
                                <CardTitle className="text-white">Staff Workload</CardTitle>
                                <CardDescription className="text-gray-300">
                                    Current ticket distribution
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-4">
                                    {currentStaff.map((staff) => (
                                        <div key={staff.id} className="space-y-1">
                                            <div className="flex items-center justify-between">
                                                <span className="text-sm font-medium text-white">{staff.name}</span>
                                                <span className="text-sm text-gray-300">
                                                    {staff.activeTickets} tickets
                                                </span>
                                            </div>
                                            <div className="h-2 bg-[#0a1e46] rounded-full overflow-hidden">
                                                <div
                                                    className="h-full rounded-full transition-all"
                                                    style={{
                                                        width: `${Math.min((staff.activeTickets / 5) * 100, 100)}%`,
                                                        backgroundColor: staff.activeTickets > 4 ? '#ef4444' : '#3b82f6'
                                                    }}
                                                />
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </CardContent>
                        </Card>
                    </TabsContent>

                    <TabsContent value="locations">
                        <Card className="bg-[#0f2a5e] border-gray-700">
                            <CardHeader>
                                <CardTitle className="text-white">Locations</CardTitle>
                                <CardDescription className="text-gray-300">
                                    Manage maintenance locations
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-4">
                                    {locations.map((location) => (
                                        <div
                                            key={location.id}
                                            className="flex items-center justify-between p-2 border border-gray-700 rounded-lg bg-[#0a1e46]"
                                        >
                                            <span className="text-white">{location.name}</span>
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                className="text-gray-300 hover:text-white hover:bg-[#0a1e46]"
                                            >
                                                Edit
                                            </Button>
                                        </div>
                                    ))}
                                    <Button className="w-full bg-blue-600 hover:bg-blue-700">
                                        Add Location
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    </TabsContent>
                </Tabs>
            </SheetContent>
        </Sheet>
    );
}