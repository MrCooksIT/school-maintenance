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
    const [submitStatus, setSubmitStatus] = useState(null); // 'success', 'error', null
    const [errorMessage, setErrorMessage] = useState('');
    const [imageFile, setImageFile] = useState(null);
    const [imagePreview, setImagePreview] = useState(null);

    // Load locations and categories
    useEffect(() => {
        const loadData = async () => {
            try {
                // Load locations
                const locationsRef = ref(database, 'locations');
                const locationsSnapshot = await get(locationsRef);
                if (locationsSnapshot.exists()) {
                    const locationsData = Object.entries(locationsSnapshot.val()).map(([id, data]) => ({
                        id,
                        name: data.name
                    }));
                    setLocations(locationsData);
                }

                // Load categories
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
            // Validate file size (max 5MB)
            if (file.size > 5 * 1024 * 1024) {
                setErrorMessage('Image file size must be less than 5MB');
                return;
            }

            // Validate file type
            if (!file.type.startsWith('image/')) {
                setErrorMessage('Please upload a valid image file');
                return;
            }

            setImageFile(file);

            // Create preview
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

        // Validate email format
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(formData.reporterEmail)) {
            setErrorMessage('Please provide a valid email address');
            return false;
        }

        // Validate Marist St Joseph's email domain
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

            // Prepare ticket data
            const ticketData = {
                ...formData,
                status: 'pending',
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
                source: 'public_form',
                imageUrl: imagePreview || null // Store base64 if image exists
            };

            // Push to Firebase
            await push(ticketsRef, ticketData);

            // Show success message
            setSubmitStatus('success');

            // Reset form after 2 seconds
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
        { value: 'low', label: 'Low', color: 'text-green-600' },
        { value: 'medium', label: 'Medium', color: 'text-yellow-600' },
        { value: 'high', label: 'High', color: 'text-orange-600' },
        { value: 'urgent', label: 'Urgent', color: 'text-red-600' }
    ];

    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-12 px-4 sm:px-6 lg:px-8">
            <div className="max-w-3xl mx-auto">
                {/* Header */}
                <div className="text-center mb-8">
                    <div className="flex justify-center mb-4">
                        <img
                            src="/school-maintenance/public/school-logo2.png"
                            alt="Marist St Joseph's Logo"
                            className="h-20 w-auto"
                        />
                    </div>
                    <h1 className="text-3xl font-bold text-gray-900 mb-2">
                        Maintenance Request
                    </h1>
                    <p className="text-gray-600">
                        Report a maintenance issue and we'll get it fixed as soon as possible
                    </p>
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
                <div className="bg-white rounded-xl shadow-lg p-8">
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
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
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
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
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
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
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
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
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
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                {priorityOptions.map(option => (
                                    <button
                                        key={option.value}
                                        type="button"
                                        onClick={() => setFormData(prev => ({ ...prev, priority: option.value }))}
                                        className={`p-3 rounded-lg border-2 transition-all ${formData.priority === option.value
                                            ? 'border-indigo-500 bg-indigo-50'
                                            : 'border-gray-200 hover:border-gray-300'
                                            }`}
                                    >
                                        <span className={`font-medium ${option.color}`}>
                                            {option.label}
                                        </span>
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
                                <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-indigo-400 transition-colors">
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
                                        className="w-full h-48 object-cover rounded-lg"
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
                                        placeholder="Jane Doe"
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
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
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                                        required
                                    />
                                    <p className="text-xs text-gray-500 mt-1">Please use your Marist email</p>
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
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Submit Button */}
                        <div className="flex justify-end pt-4">
                            <button
                                type="submit"
                                disabled={loading}
                                className="px-8 py-3 bg-indigo-600 text-white font-medium rounded-lg hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
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
                <div className="mt-8 text-center text-sm text-gray-600">
                    <p>Need help? Contact the website admin directly at acoetzee@maristsj.co.za</p>
                </div>
            </div>
        </div>
    );
};

export default PublicTicketForm;