// src/components/public/PublicLandingPage.jsx
// Optional landing page that can be linked from your school website
import React from 'react';
import { Link } from 'react-router-dom';
import { Wrench, ClipboardList, Clock, CheckCircle } from 'lucide-react';

const PublicLandingPage = () => {
    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
            {/* Header */}
            <div className="bg-white shadow-sm">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
                    <div className="flex items-center gap-3">
                        <Wrench className="h-8 w-8 text-indigo-600" />
                        <h1 className="text-2xl font-bold text-gray-900">
                            School Maintenance Portal
                        </h1>
                    </div>
                </div>
            </div>

            {/* Hero Section */}
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
                <div className="text-center mb-12">
                    <h2 className="text-4xl font-bold text-gray-900 mb-4">
                        Report Maintenance Issues Quickly
                    </h2>
                    <p className="text-xl text-gray-600 max-w-2xl mx-auto">
                        Help us keep our school facilities in top condition by reporting any maintenance issues you encounter
                    </p>
                </div>

                {/* CTA Button */}
                <div className="flex justify-center mb-16">
                    <Link
                        to="/submit-ticket"
                        className="inline-flex items-center gap-2 px-8 py-4 bg-indigo-600 text-white text-lg font-semibold rounded-lg hover:bg-indigo-700 shadow-lg hover:shadow-xl transition-all"
                    >
                        <ClipboardList className="h-6 w-6" />
                        Submit a Maintenance Request
                    </Link>
                </div>

                {/* Features */}
                <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
                    <div className="bg-white rounded-lg p-6 shadow-md">
                        <div className="flex justify-center mb-4">
                            <div className="p-3 bg-blue-100 rounded-full">
                                <ClipboardList className="h-8 w-8 text-blue-600" />
                            </div>
                        </div>
                        <h3 className="text-xl font-semibold text-gray-900 mb-2 text-center">
                            Easy to Use
                        </h3>
                        <p className="text-gray-600 text-center">
                            Simple form to report any maintenance issues - no technical knowledge required
                        </p>
                    </div>

                    <div className="bg-white rounded-lg p-6 shadow-md">
                        <div className="flex justify-center mb-4">
                            <div className="p-3 bg-green-100 rounded-full">
                                <Clock className="h-8 w-8 text-green-600" />
                            </div>
                        </div>
                        <h3 className="text-xl font-semibold text-gray-900 mb-2 text-center">
                            Fast Response
                        </h3>
                        <p className="text-gray-600 text-center">
                            Your request is immediately sent to our maintenance team for quick action
                        </p>
                    </div>

                    <div className="bg-white rounded-lg p-6 shadow-md">
                        <div className="flex justify-center mb-4">
                            <div className="p-3 bg-purple-100 rounded-full">
                                <CheckCircle className="h-8 w-8 text-purple-600" />
                            </div>
                        </div>
                        <h3 className="text-xl font-semibold text-gray-900 mb-2 text-center">
                            Track Progress
                        </h3>
                        <p className="text-gray-600 text-center">
                            Get updates on your request status via email
                        </p>
                    </div>
                </div>

                {/* Staff Login Link */}
                <div className="mt-16 text-center">
                    <p className="text-gray-600 mb-2">
                        Maintenance team member?
                    </p>
                    <Link
                        to="/login"
                        className="text-indigo-600 hover:text-indigo-700 font-medium"
                    >
                        Sign in to the dashboard →
                    </Link>
                </div>
            </div>
        </div>
    );
};

export default PublicLandingPage;