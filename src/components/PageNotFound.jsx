// src/components/PageNotFound.jsx
import React from 'react';
import { Link } from 'react-router-dom';

const PageNotFound = () => {
    return (
        <div className="flex flex-col items-center justify-center min-h-[80vh] p-4">
            <div className="text-6xl font-bold text-gray-300 mb-4">404</div>
            <h1 className="text-3xl font-semibold mb-2">Page Not Found</h1>
            <p className="text-gray-600 mb-8 text-center max-w-md">
                The page you are looking for doesn't exist or has been moved.
            </p>
            <Link
                to="/"
                className="bg-blue-600 text-white py-2 px-6 rounded-lg hover:bg-blue-700 transition-colors"
            >
                Return to Dashboard
            </Link>
        </div>
    );
};

export default PageNotFound;