// src/components/tickets/FileAttachments.jsx
import React, { useState, useEffect } from 'react';
import { ref as storageRef, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
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
import { Tabs, TabsList, TabsTrigger, TabsContent } from "../ui/tabs";
import {
    FileIcon,
    ImageIcon,
    Trash2Icon,
    UploadIcon,
    FileTextIcon,
    DownloadIcon,
    Camera,
    Paperclip,
    Loader2,
    X
} from 'lucide-react';
import { format } from 'date-fns';
import { useToast } from "@/components/ui/use-toast";

export function FileAttachments({ ticketId }) {
    const [files, setFiles] = useState([]);
    const [emailAttachments, setEmailAttachments] = useState([]);
    const [uploading, setUploading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);
    const [dragActive, setDragActive] = useState(false);
    const { toast } = useToast();

    useEffect(() => {
        if (!ticketId) return;

        // Fetch uploaded files
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

        // Fetch email attachments
        const emailAttachmentsRef = dbRef(database, `tickets/${ticketId}/emailAttachments`);
        const emailUnsubscribe = onValue(emailAttachmentsRef, (snapshot) => {
            if (snapshot.exists()) {
                const attachmentsData = Object.entries(snapshot.val())
                    .map(([id, attachment]) => ({
                        id,
                        ...attachment
                    }))
                    .sort((a, b) => new Date(b.receivedAt) - new Date(a.receivedAt));
                setEmailAttachments(attachmentsData);
            } else {
                setEmailAttachments([]);
            }
        });

        return () => {
            unsubscribe();
            emailUnsubscribe();
        };
    }, [ticketId]);

    const handleFileUpload = async (event) => {
        const file = event.target.files?.[0];
        if (!file || !ticketId) return;

        // Validate file size (10MB limit)
        if (file.size > 10 * 1024 * 1024) {
            toast({
                title: "File Too Large",
                description: "Maximum file size is 10MB",
                variant: "destructive"
            });
            return;
        }

        setUploading(true);
        setUploadProgress(10);

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
                    name: "Current User", // Replace with actual user data when available
                    id: "user123"
                }
            });

            setUploadProgress(100);
            toast({
                title: "File Uploaded",
                description: "Your file has been uploaded successfully",
                variant: "success"
            });
        } catch (error) {
            console.error('Error uploading file:', error);
            toast({
                title: "Upload Failed",
                description: "There was an error uploading your file",
                variant: "destructive"
            });
        } finally {
            setUploading(false);
            setTimeout(() => setUploadProgress(0), 1000);
        }
    };

    const handleDelete = async (fileId, fileName) => {
        if (!window.confirm('Are you sure you want to delete this file?')) return;

        try {
            // Delete from Storage
            const fileRef = storageRef(storage, `tickets/${ticketId}/${fileName}`);
            await deleteObject(fileRef);

            // Delete from Database
            const dbFileRef = dbRef(database, `tickets/${ticketId}/attachments/${fileId}`);
            await remove(dbFileRef);

            toast({
                title: "File Deleted",
                description: "File has been deleted successfully",
                variant: "success"
            });
        } catch (error) {
            console.error('Error deleting file:', error);
            toast({
                title: "Delete Failed",
                description: "There was an error deleting the file",
                variant: "destructive"
            });
        }
    };

    const getFileIcon = (fileType) => {
        if (fileType?.startsWith('image/')) return <ImageIcon className="h-5 w-5 text-blue-500" />;
        if (fileType?.includes('pdf')) return <FileTextIcon className="h-5 w-5 text-red-500" />;
        return <FileIcon className="h-5 w-5 text-gray-500" />;
    };

    const formatFileSize = (bytes) => {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    };

    const handleDrag = (e) => {
        e.preventDefault();
        e.stopPropagation();

        if (e.type === 'dragenter' || e.type === 'dragover') {
            setDragActive(true);
        } else if (e.type === 'dragleave') {
            setDragActive(false);
        }
    };

    const handleDrop = (e) => {
        e.preventDefault();
        e.stopPropagation();
        setDragActive(false);

        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            // Use the first file from the drop
            const fileInput = { target: { files: [e.dataTransfer.files[0]] } };
            handleFileUpload(fileInput);
        }
    };

    return (
        <div className="flex flex-col h-full">
            <Tabs defaultValue="uploaded" className="w-full">
                <TabsList className="grid grid-cols-3">
                    <TabsTrigger value="uploaded">Uploaded Files ({files.length})</TabsTrigger>
                    <TabsTrigger value="email">Email Attachments ({emailAttachments.length})</TabsTrigger>
                    <TabsTrigger value="all">All Files ({files.length + emailAttachments.length})</TabsTrigger>
                </TabsList>

                {/* File upload section - Visible in all tabs */}
                <div
                    className={`mt-4 border-2 border-dashed rounded-lg p-4 text-center transition-colors ${dragActive ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:bg-gray-50'
                        }`}
                    onDragEnter={handleDrag}
                    onDragLeave={handleDrag}
                    onDragOver={handleDrag}
                    onDrop={handleDrop}
                >
                    <div className="flex items-center justify-center gap-4">
                        <div className="flex-1">
                            <label className="flex flex-col items-center justify-center cursor-pointer py-2">
                                <UploadIcon className="h-6 w-6 mb-2 text-gray-400" />
                                <span className="text-sm font-medium">Click to upload or drag and drop</span>
                                <span className="text-xs text-gray-500 mt-1">Max 10MB</span>
                                <Input
                                    type="file"
                                    className="hidden"
                                    onChange={handleFileUpload}
                                    disabled={uploading}
                                    accept="image/*,.pdf,.doc,.docx,.xls,.xlsx"
                                />
                            </label>
                        </div>

                        <div className="border-l border-gray-300 h-16"></div>

                        <div className="w-20">
                            <label className="flex flex-col items-center justify-center cursor-pointer">
                                <Camera className="h-6 w-6 mb-1 text-gray-400" />
                                <span className="text-xs">Take Photo</span>
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
                        <div className="mt-2">
                            <div className="flex items-center gap-2">
                                <Loader2 className="h-4 w-4 animate-spin text-blue-500" />
                                <span className="text-sm">Uploading... {uploadProgress}%</span>
                            </div>
                            <div className="w-full bg-gray-200 h-1 mt-1 rounded-full">
                                <div
                                    className="bg-blue-600 h-1 rounded-full transition-all duration-300"
                                    style={{ width: `${uploadProgress}%` }}
                                />
                            </div>
                        </div>
                    )}
                </div>

                <TabsContent value="uploaded" className="mt-4 space-y-3">
                    {files.length === 0 ? (
                        <div className="text-center py-8 bg-gray-50 rounded-lg">
                            <Paperclip className="h-8 w-8 mx-auto text-gray-400 mb-2" />
                            <p className="text-gray-500">No files uploaded yet</p>
                        </div>
                    ) : (
                        files.map((file) => (
                            <FileItem
                                key={file.id}
                                file={file}
                                getFileIcon={getFileIcon}
                                formatFileSize={formatFileSize}
                                onDelete={() => handleDelete(file.id, file.name)}
                            />
                        ))
                    )}
                </TabsContent>

                <TabsContent value="email" className="mt-4 space-y-3">
                    {emailAttachments.length === 0 ? (
                        <div className="text-center py-8 bg-gray-50 rounded-lg">
                            <Paperclip className="h-8 w-8 mx-auto text-gray-400 mb-2" />
                            <p className="text-gray-500">No email attachments found</p>
                        </div>
                    ) : (
                        emailAttachments.map((attachment) => (
                            <FileItem
                                key={attachment.id}
                                file={attachment}
                                getFileIcon={getFileIcon}
                                formatFileSize={formatFileSize}
                                isEmailAttachment
                            />
                        ))
                    )}
                </TabsContent>

                <TabsContent value="all" className="mt-4 space-y-3">
                    {files.length === 0 && emailAttachments.length === 0 ? (
                        <div className="text-center py-8 bg-gray-50 rounded-lg">
                            <Paperclip className="h-8 w-8 mx-auto text-gray-400 mb-2" />
                            <p className="text-gray-500">No files found</p>
                        </div>
                    ) : (
                        <>
                            {[...files, ...emailAttachments].sort((a, b) => {
                                const dateA = new Date(a.uploadedAt || a.receivedAt);
                                const dateB = new Date(b.uploadedAt || b.receivedAt);
                                return dateB - dateA;
                            }).map((file) => (
                                <FileItem
                                    key={file.id}
                                    file={file}
                                    getFileIcon={getFileIcon}
                                    formatFileSize={formatFileSize}
                                    onDelete={file.uploadedAt ? () => handleDelete(file.id, file.name) : undefined}
                                    isEmailAttachment={!file.uploadedAt}
                                />
                            ))}
                        </>
                    )}
                </TabsContent>
            </Tabs>
        </div>
    );
}

// File Item Component
const FileItem = ({ file, getFileIcon, formatFileSize, onDelete, isEmailAttachment = false }) => {
    const date = new Date(file.uploadedAt || file.receivedAt);

    return (
        <div className="flex items-center justify-between p-3 bg-white border border-gray-200 rounded-lg hover:bg-gray-50">
            <div className="flex items-center gap-3">
                {getFileIcon(file.type)}
                <div>
                    <p className="font-medium text-sm">{file.name}</p>
                    <div className="flex gap-2 text-xs text-gray-500">
                        <span>{formatFileSize(file.size)}</span>
                        <span>•</span>
                        <span>{format(date, 'd MMM yyyy')}</span>
                        {isEmailAttachment && <span className="text-blue-500">• Email</span>}
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
                    <DownloadIcon className="h-3 w-3 mr-1" />
                    View
                </Button>

                {onDelete && (
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={onDelete}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50 text-xs"
                    >
                        <Trash2Icon className="h-3 w-3" />
                    </Button>
                )}
            </div>
        </div>
    );
};