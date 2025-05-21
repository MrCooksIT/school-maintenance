// src/components/layout/RootLayout.jsx
import React, { useState, useEffect } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthProvider';
import Sidebar from './Sidebar';
import {
    UserCircle,
    LogOut,
    Shield,
    Menu
} from 'lucide-react';
import SimpleDropdown, {
    SimpleDropdownItem,
    SimpleDropdownDivider,
    SimpleDropdownLabel
} from '../ui/SimpleDropdown';

// Simple Button Component
const SimpleButton = ({ children, onClick, className = "", variant = "default" }) => {
    const getButtonClass = () => {
        switch (variant) {
            case "ghost":
                return "bg-transparent hover:bg-gray-100 text-gray-700";
            case "icon":
                return "p-2 rounded-full";
            default:
                return "bg-blue-600 hover:bg-blue-700 text-white";
        }
    };

    return (
        <button
            onClick={onClick}
            className={`rounded-md font-medium focus:outline-none ${getButtonClass()} ${className}`}
        >
            {children}
        </button>
    );
};

// Header Component
const Header = ({ toggleSidebar, userRole, signOut }) => {
    const navigate = useNavigate();
    const isAdmin = userRole === 'admin' || userRole === 'supervisor';

    return (
        <div className="bg-[#0a1e46] text-white h-16 flex items-center justify-between px-6 shadow-lg fixed top-0 right-0 left-0 z-40">
            {/* Sidebar toggle button */}
            <SimpleButton
                variant="ghost"
                onClick={toggleSidebar}
                className="text-white hover:bg-blue-900/50 p-2 rounded-full"
            >
                <Menu className="h-5 w-5" />
            </SimpleButton>

            {/* Centered logo and title */}
            <div className="absolute left-1/2 -translate-x-1/2 flex items-center gap-4">
                <img src="/school-maintenance/school-logo2.png" alt="SJMC Logo" className="h-12" />
                <div className="hidden md:block text-center">
                    <h1 className="text-xl font-semibold">SJMC Maintenance Portal</h1>
                </div>
            </div>

            {/* Icons on the right */}
            <div className="flex items-center gap-4">
                {/* User Menu Dropdown */}
                <SimpleDropdown
                    trigger={
                        <SimpleButton
                            variant="ghost"
                            className="text-white hover:bg-blue-900/50 p-2 rounded-full"
                        >
                            <UserCircle className="h-6 w-6" />
                        </SimpleButton>
                    }
                    align="right"
                >
                    <SimpleDropdownLabel>My Account</SimpleDropdownLabel>

                    <SimpleDropdownDivider />

                    {isAdmin && (
                        <>
                            <SimpleDropdownItem
                                onClick={() => navigate('/admin/team')}
                                className="flex items-center gap-2"
                            >
                                <Shield className="h-4 w-4" />
                                <span>Admin Panel</span>
                            </SimpleDropdownItem>
                            <SimpleDropdownDivider />
                        </>
                    )}

                    <SimpleDropdownItem
                        onClick={signOut}
                        className="flex items-center gap-2 text-red-600"
                    >
                        <LogOut className="h-4 w-4" />
                        <span>Sign out</span>
                    </SimpleDropdownItem>
                </SimpleDropdown>
            </div>
        </div>
    );
};

const RootLayout = () => {
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [showDebug, setShowDebug] = useState(false);
    const { userRole, signOut } = useAuth();

    // Debug mode keyboard shortcut
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.ctrlKey && e.shiftKey && e.key === 'D') {
                setShowDebug(prev => !prev);
            }
        };
        window.addEventListener('keydown', handleKeyDown);

        return () => {
            window.removeEventListener('keydown', handleKeyDown);
        };
    }, []);

    const toggleSidebar = () => {
        setIsSidebarOpen((prev) => !prev);
    };

    return (
        <div className="flex h-screen bg-gray-50">
            {/* Sidebar */}
            <Sidebar isOpen={isSidebarOpen} toggleSidebar={toggleSidebar} />

            {/* Main content - adjusts based on sidebar state */}
            <div className={`flex-1 flex flex-col transition-all duration-300 ${isSidebarOpen ? 'ml-64' : 'ml-0'}`}>
                <Header toggleSidebar={toggleSidebar} userRole={userRole} signOut={signOut} />

                {showDebug && (
                    <div className="fixed top-16 right-4 z-50">
                        <RoleDebugger />
                    </div>
                )}
                <main className="flex-1 mt-16 p-4 overflow-auto">
                    <Outlet />
                </main>
            </div>
        </div>
    );
};

export default RootLayout;