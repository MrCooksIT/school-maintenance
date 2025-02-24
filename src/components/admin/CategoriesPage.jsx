// src/admin/CategoriesPage.jsx
import React, { useState, useEffect } from 'react';
import { ref, set, onValue, push, remove } from 'firebase/database';
import { database } from '@/config/firebase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle
} from '@/components/ui/card';
import { Trash2, Edit2, Plus, Cat } from 'lucide-react';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from '@/components/ui/dialog';

const CategoriesPage = () => {
    const [categories, setCategories] = useState([]);
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [selectedCategory, setSelectedCategory] = useState(null);
    const [newCategory, setNewCategory] = useState({
        name: '',
        description: '',
        color: '#1a73e8' // Default color
    });

    useEffect(() => {
        const categoriesRef = ref(database, 'categories');
        const unsubscribe = onValue(categoriesRef, (snapshot) => {
            if (snapshot.exists()) {
                const categoriesData = Object.entries(snapshot.val()).map(([id, data]) => ({
                    id,
                    ...data
                }));
                setCategories(categoriesData);
            }
        });

        return () => unsubscribe();
    }, []);

    const handleAdd = async () => {
        if (!newCategory.name.trim()) return;

        try {
            const categoriesRef = ref(database, 'categories');
            await push(categoriesRef, {
                ...newCategory,
                createdAt: new Date().toISOString()
            });

            setNewCategory({ name: '', description: '', color: '#1a73e8' });
            setIsAddModalOpen(false);
        } catch (error) {
            console.error('Error adding category:', error);
        }
    };

    const handleEdit = async () => {
        if (!selectedCategory || !selectedCategory.name.trim()) return;

        try {
            const categoryRef = ref(database, `categories/${selectedCategory.id}`);
            await set(categoryRef, {
                ...selectedCategory,
                updatedAt: new Date().toISOString()
            });

            setIsEditModalOpen(false);
            setSelectedCategory(null);
        } catch (error) {
            console.error('Error updating category:', error);
        }
    };

    const handleDelete = async (categoryId) => {
        if (!window.confirm('Are you sure you want to delete this category?')) return;

        try {
            const categoryRef = ref(database, `categories/${categoryId}`);
            await remove(categoryRef);
        } catch (error) {
            console.error('Error deleting category:', error);
        }
    };

    return (
        <div className="p-6">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-bold">Categories</h1>
                <Button onClick={() => setIsAddModalOpen(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Category
                </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {categories.map(category => (
                    <Card key={category.id}>
                        <CardHeader>
                            <CardTitle className="flex items-center justify-between">
                                <span>{category.name}</span>
                                <div
                                    className="w-4 h-4 rounded-full"
                                    style={{ backgroundColor: category.color }}
                                />
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p className="text-sm text-muted-foreground mb-4">
                                {category.description}
                            </p>
                            <div className="flex justify-end gap-2">
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => {
                                        setSelectedCategory(category);
                                        setIsEditModalOpen(true);
                                    }}
                                >
                                    <Edit2 className="h-4 w-4" />
                                </Button>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleDelete(category.id)}
                                >
                                    <Trash2 className="h-4 w-4 text-red-500" />
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>

            {/* Add Category Modal */}
            <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Add New Category</DialogTitle>
                        <DialogDescription>
                            Create a new category for organizing maintenance tickets
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div>
                            <label className="text-sm font-medium mb-1">Name</label>
                            <Input
                                value={newCategory.name}
                                onChange={(e) => setNewCategory(prev => ({
                                    ...prev,
                                    name: e.target.value
                                }))}
                                placeholder="Category name"
                            />
                        </div>
                        <div>
                            <label className="text-sm font-medium mb-1">Description</label>
                            <Input
                                value={newCategory.description}
                                onChange={(e) => setNewCategory(prev => ({
                                    ...prev,
                                    description: e.target.value
                                }))}
                                placeholder="Category description"
                            />
                        </div>
                        <div>
                            <label className="text-sm font-medium mb-1">Color</label>
                            <Input
                                type="color"
                                value={newCategory.color}
                                onChange={(e) => setNewCategory(prev => ({
                                    ...prev,
                                    color: e.target.value
                                }))}
                            />
                        </div>
                    </div>
                    <div className="flex justify-end gap-2">
                        <Button variant="outline" onClick={() => setIsAddModalOpen(false)}>
                            Cancel
                        </Button>
                        <Button onClick={handleAdd}>Add Category</Button>
                    </div>
                </DialogContent>
            </Dialog>

            {/* Edit Category Modal */}
            <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Edit Category</DialogTitle>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div>
                            <label className="text-sm font-medium mb-1">Name</label>
                            <Input
                                value={selectedCategory?.name || ''}
                                onChange={(e) => setSelectedCategory(prev => ({
                                    ...prev,
                                    name: e.target.value
                                }))}
                                placeholder="Category name"
                            />
                        </div>
                        <div>
                            <label className="text-sm font-medium mb-1">Description</label>
                            <Input
                                value={selectedCategory?.description || ''}
                                onChange={(e) => setSelectedCategory(prev => ({
                                    ...prev,
                                    description: e.target.value
                                }))}
                                placeholder="Category description"
                            />
                        </div>
                        <div>
                            <label className="text-sm font-medium mb-1">Color</label>
                            <Input
                                type="color"
                                value={selectedCategory?.color || '#1a73e8'}
                                onChange={(e) => setSelectedCategory(prev => ({
                                    ...prev,
                                    color: e.target.value
                                }))}
                            />
                        </div>
                    </div>
                    <div className="flex justify-end gap-2">
                        <Button variant="outline" onClick={() => setIsEditModalOpen(false)}>
                            Cancel
                        </Button>
                        <Button onClick={handleEdit}>Save Changes</Button>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}
export default CategoriesPage;