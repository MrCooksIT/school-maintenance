// src/components/tickets/FileUpload.jsx
import React, { useState, useEffect } from 'react';
import { ref as storageRef, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { ref as dbRef, push, onValue, remove } from 'firebase/database';
import { storage, database } from '@/config/firebase';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import {
    FileIcon,
    ImageIcon,
    Trash2Icon,
    UploadIcon,
    Camera,
    Loader2
} from 'lucide-react';
import { format } from 'date-fns';

export function FileUpload({ ticketId }) {
    const [files, setFiles] = useState([]);
    const [uploading, setUploading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);

    useEffect(() => {
        if (!ticketId) return;

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
        if (!file || !ticketId) return;

        // Validate file size (10MB limit)
        if (file.size > 10 * 1024 * 1024) {
            alert('File size must be less than 10MB');
            return;
        }

        setUploading(true);
        setUploadProgress(0);

        try {
            // Create a unique filename
            const timestamp = new Date().getTime();
            const fileName = `${timestamp}_${file.name}`;
            const filePath = `tickets/${ticketId}/${fileName}`;

            // Upload to Firebase Storage
            const fileRef = storageRef(storage, filePath);
            const snapshot = await uploadBytes(fileRef, file);
            const downloadURL = await getDownloadURL(snapshot.ref);

            // Add file metadata to the database
            const filesRef = dbRef(database, `tickets/${ticketId}/attachments`);
            await push(filesRef, {
                name: file.name,
                type: file.type,
                size: file.size,
                url: downloadURL,
                path: filePath,
                uploadedAt: new Date().toISOString(),
            });

            setUploadProgress(100);
        } catch (error) {
            console.error('Error uploading file:', error);
            alert('Failed to upload file');
        } finally {
            setUploading(false);
            setUploadProgress(0);
        }
    };

    const handleDelete = async (fileId, filePath) => {
        if (!window.confirm('Are you sure you want to delete this file?')) return;

        try {
            // Delete from Storage
            const fileRef = storageRef(storage, filePath);
            await deleteObject(fileRef);

            // Delete from Database
            const dbFileRef = dbRef(database, `tickets/${ticketId}/attachments/${fileId}`);
            await remove(dbFileRef);
        } catch (error) {
            console.error('Error deleting file:', error);
            alert('Failed to delete file');
        }
    };

    const formatFileSize = (bytes) => {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    };

    const getFileIcon = (fileType) => {
        if (fileType.startsWith('image/')) return <ImageIcon className="h-5 w-5" />;
        return <FileIcon className="h-5 w-5" />;
    };

    return (
        <div className="space-y-4 p-4 bg-[#0a1e46] text-white h-[600px] overflow-y-auto">
            <div className="flex gap-4">
                {/* File Upload Button */}
                <label className="flex-1">
                    <div className="border-2 border-dashed border-gray-700 rounded-lg p-8 text-center">
                        <div className="flex flex-col items-center">
                            <UploadIcon className="w-8 h-8 mb-2 text-gray-500" />
                            <p className="text-sm text-gray-500">Click to upload file</p>
                            <p className="text-xs text-gray-400">Max 10MB</p>
                        </div>
                        <Input
                            type="file"
                            className="hidden"
                            onChange={handleFileUpload}
                            disabled={uploading}
                            accept="image/*,.pdf,.doc,.docx"
                        />
                    </div>
                </label>

                {/* Camera Button (Mobile) */}
                <label>
                    <div className="flex items-center justify-center w-32 h-32 border-2 border-dashed rounded-lg cursor-pointer hover:bg-gray-50">
                        <div className="flex flex-col items-center">
                            <Camera className="w-8 h-8 mb-2 text-gray-500" />
                            <p className="text-xs text-gray-500">Take Photo</p>
                        </div>
                        <Input
                            type="file"
                            className="hidden"
                            onChange={handleFileUpload}
                            disabled={uploading}
                            accept="image/*"
                            capture="environment"
                        />
                    </div>
                </label>
            </div>

            {uploading && (
                <div className="flex items-center gap-2 text-sm text-gray-500">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Uploading... {uploadProgress}%</span>
                </div>
            )}

            <div className="space-y-2">
                {files.map((file) => (
                    <div
                        key={file.id}
                        className="flex items-center justify-between p-3 border rounded-lg"
                    >
                        <div className="flex items-center gap-3">
                            {getFileIcon(file.type)}
                            <div>
                                <p className="font-medium">{file.name}</p>
                                <div className="flex gap-2 text-sm text-gray-500">
                                    <span>{formatFileSize(file.size)}</span>
                                    <span>•</span>
                                    <span>{format(new Date(file.uploadedAt), 'PP')}</span>
                                </div>
                            </div>
                        </div>

                        <div className="flex gap-2">
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => window.open(file.url, '_blank')}
                            >
                                View
                            </Button>
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDelete(file.id, file.path)}
                            >
                                <Trash2Icon className="h-4 w-4 text-red-500" />
                            </Button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}