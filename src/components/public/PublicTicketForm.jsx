// src/components/public/PublicTicketForm.jsx
import React, { useState, useEffect } from 'react';
import { database } from '../../config/firebase';
import { ref, push, get } from 'firebase/database';
import {
    AlertCircle,
    CheckCircle,
    MapPin,
    FileText,
    Flag,
    Upload,
    X,
    Loader2
} from 'lucide-react';

const PublicTicketForm = () => {
    const [formData, setFormData] = useState({
        title: '',
        description: '',
        location: '',
        category: '',
        priority: 'medium',
        reportedBy: '',
        reporterEmail: '',
        reporterPhone: ''
    });

    const [locations, setLocations] = useState([]);
    const [categories, setCategories] = useState([]);
    const [loading, setLoading] = useState(false);
    const [submitStatus, setSubmitStatus] = useState(null);
    const [errorMessage, setErrorMessage] = useState('');
    const [imageFile, setImageFile] = useState(null);
    const [imagePreview, setImagePreview] = useState(null);

    // Load locations and categories
    useEffect(() => {
        const loadData = async () => {
            try {
                const locationsRef = ref(database, 'locations');
                const locationsSnapshot = await get(locationsRef);
                if (locationsSnapshot.exists()) {
                    const locationsData = Object.entries(locationsSnapshot.val()).map(([id, data]) => ({
                        id,
                        name: data.name
                    }));
                    setLocations(locationsData);
                }

                const categoriesRef = ref(database, 'categories');
                const categoriesSnapshot = await get(categoriesRef);
                if (categoriesSnapshot.exists()) {
                    const categoriesData = Object.entries(categoriesSnapshot.val()).map(([id, data]) => ({
                        id,
                        name: data.name
                    }));
                    setCategories(categoriesData);
                }
            } catch (error) {
                console.error('Error loading data:', error);
            }
        };

        loadData();
    }, []);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
    };

    const handleImageChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            if (file.size > 5 * 1024 * 1024) {
                setErrorMessage('Image file size must be less than 5MB');
                return;
            }

            if (!file.type.startsWith('image/')) {
                setErrorMessage('Please upload a valid image file');
                return;
            }

            setImageFile(file);

            const reader = new FileReader();
            reader.onloadend = () => {
                setImagePreview(reader.result);
            };
            reader.readAsDataURL(file);
        }
    };

    const removeImage = () => {
        setImageFile(null);
        setImagePreview(null);
    };

    const validateForm = () => {
        if (!formData.title.trim()) {
            setErrorMessage('Please provide a title for the issue');
            return false;
        }
        if (!formData.description.trim()) {
            setErrorMessage('Please provide a description');
            return false;
        }
        if (!formData.location) {
            setErrorMessage('Please select a location');
            return false;
        }
        if (!formData.category) {
            setErrorMessage('Please select a category');
            return false;
        }
        if (!formData.reportedBy.trim()) {
            setErrorMessage('Please provide your name');
            return false;
        }
        if (!formData.reporterEmail.trim()) {
            setErrorMessage('Please provide your email address');
            return false;
        }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(formData.reporterEmail)) {
            setErrorMessage('Please provide a valid email address');
            return false;
        }

        if (!formData.reporterEmail.toLowerCase().endsWith('@maristsj.co.za')) {
            setErrorMessage('Please use your Marist St Joseph\'s email address (@maristsj.co.za)');
            return false;
        }

        return true;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setErrorMessage('');
        setSubmitStatus(null);

        if (!validateForm()) {
            return;
        }

        setLoading(true);

        try {
            const ticketsRef = ref(database, 'tickets');

            const ticketData = {
                ...formData,
                status: 'pending',
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
                source: 'public_form',
                imageUrl: imagePreview || null
            };

            await push(ticketsRef, ticketData);

            setSubmitStatus('success');

            setTimeout(() => {
                setFormData({
                    title: '',
                    description: '',
                    location: '',
                    category: '',
                    priority: 'medium',
                    reportedBy: '',
                    reporterEmail: '',
                    reporterPhone: ''
                });
                setImageFile(null);
                setImagePreview(null);
                setSubmitStatus(null);
            }, 3000);

        } catch (error) {
            console.error('Error submitting ticket:', error);
            setErrorMessage('Failed to submit ticket. Please try again.');
            setSubmitStatus('error');
        } finally {
            setLoading(false);
        }
    };

    const priorityOptions = [
        { value: 'low', label: 'Low', color: 'bg-green-100 text-green-700 border-green-300' },
        { value: 'medium', label: 'Medium', color: 'bg-yellow-100 text-yellow-700 border-yellow-300' },
        { value: 'high', label: 'High', color: 'bg-red-100 text-red-700 border-red-300' }
    ];

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Header - Matching SJMC Style */}
            <div className="bg-[#0a1e46] shadow-md">
                <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
                    <div className="flex items-center justify-center gap-3">
                        <img
                            src="/school-logo2.png"
                            alt="Marist St Joseph's Logo"
                            className="h-10 w-auto"
                        />
                        <h1 className="text-xl font-semibold text-white">
                            SJMC Maintenance Portal
                        </h1>
                    </div>
                </div>
            </div>

            <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {/* Page Title */}
                <div className="mb-6">
                    <h2 className="text-2xl font-bold text-gray-900">Submit Maintenance Request</h2>
                    <p className="text-gray-600 mt-1">Report a maintenance issue and we'll get it fixed as soon as possible</p>
                </div>

                {/* Success Message */}
                {submitStatus === 'success' && (
                    <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg flex items-center gap-3">
                        <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0" />
                        <div>
                            <p className="font-medium text-green-900">Ticket submitted successfully!</p>
                            <p className="text-sm text-green-700">We'll get back to you soon.</p>
                        </div>
                    </div>
                )}

                {/* Error Message */}
                {errorMessage && (
                    <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-3">
                        <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0" />
                        <p className="text-sm text-red-700">{errorMessage}</p>
                    </div>
                )}

                {/* Form */}
                <div className="bg-white rounded-lg shadow border border-gray-200 p-6">
                    <form onSubmit={handleSubmit} className="space-y-6">
                        {/* Issue Title */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Issue Title *
                            </label>
                            <input
                                type="text"
                                name="title"
                                value={formData.title}
                                onChange={handleChange}
                                placeholder="e.g., Broken window in classroom"
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                required
                            />
                        </div>

                        {/* Description */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Description *
                            </label>
                            <textarea
                                name="description"
                                value={formData.description}
                                onChange={handleChange}
                                rows="4"
                                placeholder="Please provide detailed information about the issue..."
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                required
                            />
                        </div>

                        {/* Location and Category Row */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {/* Location */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    <MapPin className="inline h-4 w-4 mr-1" />
                                    Location *
                                </label>
                                <select
                                    name="location"
                                    value={formData.location}
                                    onChange={handleChange}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                    required
                                >
                                    <option value="">Select location</option>
                                    {locations.map(location => (
                                        <option key={location.id} value={location.name}>
                                            {location.name}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            {/* Category */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Category *
                                </label>
                                <select
                                    name="category"
                                    value={formData.category}
                                    onChange={handleChange}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                    required
                                >
                                    <option value="">Select category</option>
                                    {categories.map(category => (
                                        <option key={category.id} value={category.name}>
                                            {category.name}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        {/* Priority */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                <Flag className="inline h-4 w-4 mr-1" />
                                Priority *
                            </label>
                            <div className="grid grid-cols-3 gap-3">
                                {priorityOptions.map(option => (
                                    <button
                                        key={option.value}
                                        type="button"
                                        onClick={() => setFormData(prev => ({ ...prev, priority: option.value }))}
                                        className={`p-3 rounded-md border-2 font-medium transition-all ${formData.priority === option.value
                                                ? option.color + ' border-current'
                                                : 'border-gray-300 bg-white text-gray-700 hover:border-gray-400'
                                            }`}
                                    >
                                        {option.label}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Image Upload */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                <Upload className="inline h-4 w-4 mr-1" />
                                Add Photo (Optional)
                            </label>

                            {!imagePreview ? (
                                <div className="border-2 border-dashed border-gray-300 rounded-md p-6 text-center hover:border-blue-400 transition-colors">
                                    <input
                                        type="file"
                                        accept="image/*"
                                        onChange={handleImageChange}
                                        className="hidden"
                                        id="image-upload"
                                    />
                                    <label htmlFor="image-upload" className="cursor-pointer">
                                        <Upload className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                                        <p className="text-sm text-gray-600">Click to upload image</p>
                                        <p className="text-xs text-gray-500 mt-1">Max size: 5MB</p>
                                    </label>
                                </div>
                            ) : (
                                <div className="relative">
                                    <img
                                        src={imagePreview}
                                        alt="Preview"
                                        className="w-full h-48 object-cover rounded-md border border-gray-300"
                                    />
                                    <button
                                        type="button"
                                        onClick={removeImage}
                                        className="absolute top-2 right-2 p-1 bg-red-500 text-white rounded-full hover:bg-red-600"
                                    >
                                        <X className="h-4 w-4" />
                                    </button>
                                </div>
                            )}
                        </div>

                        {/* Reporter Information */}
                        <div className="border-t pt-6">
                            <h3 className="text-lg font-medium text-gray-900 mb-4">Your Contact Information</h3>

                            <div className="space-y-4">
                                {/* Name */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Your Name *
                                    </label>
                                    <input
                                        type="text"
                                        name="reportedBy"
                                        value={formData.reportedBy}
                                        onChange={handleChange}
                                        placeholder="John Doe"
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                        required
                                    />
                                </div>

                                {/* Email */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Email Address *
                                    </label>
                                    <input
                                        type="email"
                                        name="reporterEmail"
                                        value={formData.reporterEmail}
                                        onChange={handleChange}
                                        placeholder="yourname@maristsj.co.za"
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                        required
                                    />
                                    <p className="text-xs text-gray-500 mt-1">Please use your Marist St Joseph's email</p>
                                </div>

                                {/* Phone (Optional) */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Phone Number (Optional)
                                    </label>
                                    <input
                                        type="tel"
                                        name="reporterPhone"
                                        value={formData.reporterPhone}
                                        onChange={handleChange}
                                        placeholder="+27 123 456 789"
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Submit Button */}
                        <div className="flex justify-end pt-4 border-t">
                            <button
                                type="submit"
                                disabled={loading}
                                className="px-6 py-2.5 bg-[#0a1e46] text-white font-medium rounded-md hover:bg-[#0d2557] focus:outline-none focus:ring-2 focus:ring-[#0a1e46] focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                            >
                                {loading ? (
                                    <>
                                        <Loader2 className="h-5 w-5 animate-spin" />
                                        Submitting...
                                    </>
                                ) : (
                                    'Submit Request'
                                )}
                            </button>
                        </div>
                    </form>
                </div>

                {/* Footer Info */}
                <div className="mt-6 text-center text-sm text-gray-600">
                    <p>Need help? Contact the maintenance team directly at maintenance@maristsj.co.za</p>
                </div>
            </div>
        </div>
    );
};

export default PublicTicketForm;