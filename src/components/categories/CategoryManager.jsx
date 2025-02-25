// src/components/categories/CategoryManager.jsx
import React, { useState, useEffect } from 'react';
import { ref, set, onValue, push } from 'firebase/database';
import { database } from '@/config/firebase';

export function CategoryManager() {
    const [categories, setCategories] = useState([]);
    const [newCategory, setNewCategory] = useState('');

    useEffect(() => {
        const categoriesRef = ref(database, 'categories');
        const unsubscribe = onValue(categoriesRef, (snapshot) => {
            if (snapshot.exists()) {
                setCategories(Object.entries(snapshot.val()).map(([id, data]) => ({
                    id,
                    ...data
                })));
            }
        });

        return () => unsubscribe();
    }, []);

    const handleAddCategory = async () => {
        if (!newCategory.trim()) return;

        const categoriesRef = ref(database, 'categories');
        await push(categoriesRef, {
            name: newCategory.trim(),
            createdAt: new Date().toISOString()
        });

        setNewCategory('');
    };

    return (
        <div className="p-6">
            <div className="flex gap-4 mb-6">
                <Input
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value)}
                    placeholder="New category name..."
                />
                <Button onClick={handleAddCategory}>Add Category</Button>
            </div>

            <div className="grid gap-4">
                {categories.map(category => (
                    <Card key={category.id}>
                        <CardHeader>
                            <CardTitle>{category.name}</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="flex justify-between items-center">
                                <span className="text-sm text-muted-foreground">
                                    Created {new Date(category.createdAt).toLocaleDateString('en-ZA')}
                                </span>
                                <Button variant="ghost" size="sm">
                                    <Trash2 className="h-4 w-4" />
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>
        </div>
    );
}