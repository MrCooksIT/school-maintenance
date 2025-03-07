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
    Loader2,
    FileTextIcon,
    Eye,
    AlertTriangle,
    Mail
} from 'lucide-react';
import { format } from 'date-fns';
import { useToast } from "@/components/ui/use-toast";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

export function FileUpload({ ticketId }) {
    const [files, setFiles] = useState([]);
    const [uploading, setUploading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);
    const [uploadError, setUploadError] = useState(null);
    const [activeTab, setActiveTab] = useState("all");
    const { toast } = useToast();

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

        // Reset any previous errors
        setUploadError(null);

        // Validate file size (10MB limit)
        if (file.size > 10 * 1024 * 1024) {
            setUploadError("File is too large. Maximum size is 10MB.");
            toast({
                title: "File Too Large",
                description: "File size must be less than 10MB",
                variant: "destructive"
            });
            return;
        }

        setUploading(true);
        setUploadProgress(10);

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
                source: 'manual' // This indicates it was manually uploaded
            });

            setUploadProgress(100);
            toast({
                title: "File Uploaded",
                description: "Your file has been uploaded successfully",
                variant: "success",
            });
        } catch (error) {
            console.error('Error uploading file:', error);
            setUploadError("Failed to upload file. Please try again.");
            toast({
                title: "Upload Failed",
                description: "Failed to upload file. Please try again.",
                variant: "destructive",
            });
        } finally {
            setUploading(false);
            setTimeout(() => {
                setUploadProgress(0);
            }, 1500);
        }
    };

    const handleDelete = async (fileId, filePath) => {
        try {
            // Delete from Storage
            const fileRef = storageRef(storage, filePath);
            await deleteObject(fileRef);

            // Delete from Database
            const dbFileRef = dbRef(database, `tickets/${ticketId}/attachments/${fileId}`);
            await remove(dbFileRef);

            toast({
                title: "File Deleted",
                description: "File has been deleted successfully",
                variant: "success",
            });
        } catch (error) {
            console.error('Error deleting file:', error);
            toast({
                title: "Delete Failed",
                description: "Failed to delete file. Please try again.",
                variant: "destructive",
            });
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
        if (fileType.startsWith('image/')) return <ImageIcon className="h-5 w-5 text-blue-500" />;
        if (fileType.includes('pdf')) return <FileTextIcon className="h-5 w-5 text-red-500" />;
        return <FileIcon className="h-5 w-5 text-gray-500" />;
    };

    // Filter files based on the active tab
    const filteredFiles = files.filter(file => {
        if (activeTab === "all") return true;
        if (activeTab === "email") return file.source === 'email';
        if (activeTab === "manual") return file.source === 'manual' || !file.source; // Support legacy files
        return true;
    });

    return (
        <div className="flex flex-col h-full">
            {/* Upload Section - Always visible at top */}
            <div className="p-6 bg-white border-b">
                <div className="flex gap-4">
                    {/* File Upload Button */}
                    <div className="flex-1">
                        <label className="flex flex-col items-center justify-center w-full h-24 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50">
                            <div className="flex flex-col items-center justify-center">
                                <UploadIcon className="w-8 h-8 mb-2 text-gray-400" />
                                <p className="text-sm text-gray-500">
                                    <span className="font-semibold">Click to upload</span> or drag and drop
                                </p>
                                <p className="text-xs text-gray-500">
                                    Max 10MB
                                </p>
                            </div>
                            <Input
                                type="file"
                                className="hidden"
                                onChange={handleFileUpload}
                                disabled={uploading}
                                accept="image/*,.pdf,.doc,.docx"
                            />
                        </label>
                    </div>

                    {/* Camera Button (Mobile) */}
                    <div className="w-24 h-24 flex-shrink-0">
                        <label className="flex flex-col items-center justify-center h-full border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50">
                            <div className="flex flex-col items-center justify-center">
                                <Camera className="w-6 h-6 mb-1 text-gray-400" />
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
                        </label>
                    </div>
                </div>

                {uploading && (
                    <div className="mt-4">
                        <div className="flex items-center gap-2">
                            <Loader2 className="h-4 w-4 animate-spin text-blue-500" />
                            <span className="text-sm">Uploading... {uploadProgress}%</span>
                        </div>
                        <div className="w-full bg-gray-200 h-2 mt-2 rounded-full">
                            <div
                                className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                                style={{ width: `${uploadProgress}%` }}
                            />
                        </div>
                    </div>
                )}

                {uploadError && (
                    <div className="mt-4 p-2 bg-red-50 border border-red-200 rounded-md flex items-center gap-2 text-red-800">
                        <AlertTriangle className="h-4 w-4" />
                        <span className="text-sm">{uploadError}</span>
                    </div>
                )}
            </div>

            {/* Files Section with Tabs */}
            <div className="flex-1 overflow-auto p-6 bg-gray-50">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="font-medium text-gray-700">Uploaded Files</h3>
                    <Tabs value={activeTab} onValueChange={setActiveTab} className="w-auto">
                        <TabsList className="bg-white border">
                            <TabsTrigger value="all" className="text-xs">All Files</TabsTrigger>
                            <TabsTrigger value="email" className="text-xs">Email Attachments</TabsTrigger>
                            <TabsTrigger value="manual" className="text-xs">Uploaded Files</TabsTrigger>
                        </TabsList>
                    </Tabs>
                </div>

                {filteredFiles.length === 0 ? (
                    <div className="text-center py-12 bg-white border border-gray-200 rounded-lg">
                        <p className="text-gray-500">No files found</p>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {filteredFiles.map((file) => (
                            <div
                                key={file.id}
                                className="flex items-center justify-between p-4 bg-white border border-gray-200 rounded-lg"
                            >
                                <div className="flex items-center gap-3">
                                    {getFileIcon(file.type)}
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <p className="font-medium text-sm">{file.name}</p>
                                            {file.source === 'email' && (
                                                <span className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full flex items-center">
                                                    <Mail className="h-3 w-3 mr-1" />
                                                    Email
                                                </span>
                                            )}
                                        </div>
                                        <div className="flex gap-2 text-xs text-gray-500">
                                            <span>{formatFileSize(file.size || 0)}</span>
                                            <span>•</span>
                                            <span>{format(new Date(file.uploadedAt), 'd MMM yyyy')}</span>
                                        </div>
                                    </div>
                                </div>

                                <div className="flex gap-2">
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => window.open(file.url, '_blank')}
                                        className="text-xs"
                                    >
                                        <Eye className="h-3 w-3 mr-1" />
                                        View
                                    </Button>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => {
                                            if (window.confirm('Are you sure you want to delete this file?')) {
                                                handleDelete(file.id, file.path);
                                            }
                                        }}
                                        className="text-red-600 hover:text-red-700 hover:bg-red-50 text-xs"
                                    >
                                        <Trash2Icon className="h-3 w-3 mr-1" />
                                        Delete
                                    </Button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}