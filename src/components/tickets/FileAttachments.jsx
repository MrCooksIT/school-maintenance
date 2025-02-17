// src/components/tickets/FileAttachments.jsx
import React, { useState, useEffect } from 'react';
import { ref as storageRef, uploadBytes, getDownloadURL } from 'firebase/storage';
import { ref as dbRef, push, onValue, remove } from 'firebase/database';
import { storage, database } from '@/config/firebase';
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle
} from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import {
    FileIcon,
    ImageIcon,
    Trash2Icon,
    UploadIcon,
    FileTextIcon,
    DownloadIcon,
    Loader2
} from 'lucide-react';
import { format } from 'date-fns';

export function FileAttachments({ ticketId }) {
    const [files, setFiles] = useState([]);
    const [uploading, setUploading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);

    useEffect(() => {
        const filesRef = dbRef(database, `tickets/${ticketId}/attachments`);
        const unsubscribe = onValue(filesRef, (snapshot) => {
            if (snapshot.exists()) {
                const filesData = Object.entries(snapshot.val())
                    .map(([id, file]) => ({
                        id,
                        ...file
                    }))
                    .sort((a, b) => new Date(b.uploadedAt) - new Date(a.uploadedAt));
                setFiles(filesData);
            } else {
                setFiles([]);
            }
        });

        return () => unsubscribe();
    }, [ticketId]);

    const handleFileUpload = async (event) => {
        const file = event.target.files[0];
        if (!file) return;

        setUploading(true);
        setUploadProgress(0);

        try {
            // Create a reference to the file location in Firebase Storage
            const fileRef = storageRef(storage, `tickets/${ticketId}/${file.name}`);

            // Upload the file
            const snapshot = await uploadBytes(fileRef, file);
            const downloadURL = await getDownloadURL(snapshot.ref);

            // Add file metadata to the database
            const filesRef = dbRef(database, `tickets/${ticketId}/attachments`);
            await push(filesRef, {
                name: file.name,
                type: file.type,
                size: file.size,
                url: downloadURL,
                uploadedAt: new Date().toISOString(),
                uploadedBy: {
                    name: "Current User", // Replace with actual user data
                    id: "user123"
                }
            });

            setUploadProgress(100);
        } catch (error) {
            console.error('Error uploading file:', error);
        } finally {
            setUploading(false);
            setUploadProgress(0);
        }
    };

    const handleDelete = async (fileId, fileName) => {
        if (!window.confirm('Are you sure you want to delete this file?')) return;

        try {
            // Delete from Storage
            const fileRef = storageRef(storage, `tickets/${ticketId}/${fileName}`);
            await fileRef.delete();

            // Delete from Database
            const dbFileRef = dbRef(database, `tickets/${ticketId}/attachments/${fileId}`);
            await remove(dbFileRef);
        } catch (error) {
            console.error('Error deleting file:', error);
        }
    };

    const getFileIcon = (fileType) => {
        if (fileType.startsWith('image/')) return <ImageIcon className="h-6 w-6" />;
        if (fileType.includes('pdf')) return <FileTextIcon className="h-6 w-6" />;
        return <FileIcon className="h-6 w-6" />;
    };

    const formatFileSize = (bytes) => {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    };

    return (
        <div className="space-y-4">
            <Card>
                <CardHeader>
                    <CardTitle className="text-sm font-medium">Upload Files</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="flex items-center justify-center w-full">
                        <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-lg cursor-pointer hover:bg-gray-50">
                            <div className="flex flex-col items-center justify-center pt-5 pb-6">
                                <UploadIcon className="w-8 h-8 mb-4 text-gray-500" />
                                <p className="mb-2 text-sm text-gray-500">
                                    <span className="font-semibold">Click to upload</span> or drag and drop
                                </p>
                                <p className="text-xs text-gray-500">
                                    Images, PDFs, or documents (MAX. 10MB)
                                </p>
                            </div>
                            <Input
                                type="file"
                                className="hidden"
                                onChange={handleFileUpload}
                                disabled={uploading}
                                accept="image/*,.pdf,.doc,.docx,.xls,.xlsx"
                            />
                        </label>
                    </div>
                    {uploading && (
                        <div className="mt-4">
                            <div className="flex items-center gap-2">
                                <Loader2 className="h-4 w-4 animate-spin" />
                                <span className="text-sm">Uploading... {uploadProgress}%</span>
                            </div>
                            <div className="w-full bg-gray-200 h-1 mt-2 rounded-full">
                                <div
                                    className="bg-blue-600 h-1 rounded-full transition-all duration-300"
                                    style={{ width: `${uploadProgress}%` }}
                                />
                            </div>
                        </div>
                    )}
                </CardContent>
            </Card>

            <div className="grid gap-4">
                {files.map((file) => (
                    <Card key={file.id}>
                        <CardContent className="p-4">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-4">
                                    {getFileIcon(file.type)}
                                    <div>
                                        <p className="font-medium">{file.name}</p>
                                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                            <span>{formatFileSize(file.size)}</span>
                                            <span>•</span>
                                            <span>{format(new Date(file.uploadedAt), 'PPp')}</span>
                                        </div>
                                    </div>
                                </div>

                                <div className="flex items-center gap-2">
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => window.open(file.url, '_blank')}
                                    >
                                        <DownloadIcon className="h-4 w-4 mr-2" />
                                        Download
                                    </Button>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => handleDelete(file.id, file.name)}
                                    >
                                        <Trash2Icon className="h-4 w-4 text-red-500" />
                                    </Button>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>
        </div>
    );
}