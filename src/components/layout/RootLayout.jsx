// src/components/layout/RootLayout.jsx
import React, { useState } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../auth/AuthProvider';
import Sidebar from './Sidebar';
import {
    Bell,
    UserCircle,
    LogOut,
    Shield,
    Menu,
    X
} from 'lucide-react';
import NotificationBell from '../NotificationBell';
import { Button } from '../ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '../ui/dropdown-menu';

// Header Component
const Header = ({ toggleSidebar, userRole, signOut }) => {
    const navigate = useNavigate();
    const isAdmin = userRole === 'admin' || userRole === 'supervisor';

    return (
        <div className="bg-[#0a1e46] text-white h-16 flex items-center justify-between px-6 shadow-lg fixed top-0 right-0 left-0 z-40">
            {/* Sidebar toggle button */}
            <Button
                variant="ghost"
                size="icon"
                onClick={toggleSidebar}
                className="text-white hover:bg-blue-900/50"
            >
                <Menu className="h-5 w-5" />
            </Button>

            {/* Centered logo and title */}
            <div className="absolute left-1/2 -translate-x-1/2 flex items-center gap-4">
                <img src="/school-maintenance/school-logo2.png" alt="SJMC Logo" className="h-12" />
                <div className="hidden md:block text-center">
                    <h1 className="text-xl font-semibold">SJMC Maintenance Portal</h1>
                </div>
            </div>

            {/* Icons on the right */}
            <div className="flex items-center gap-4">
                <NotificationBell userRole={userRole} />

                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="text-white hover:bg-blue-900/50">
                            <UserCircle className="h-6 w-6" />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-56">
                        <DropdownMenuLabel>My Account</DropdownMenuLabel>

                        <DropdownMenuSeparator />

                        {isAdmin && (
                            <>
                                <DropdownMenuItem
                                    className="flex items-center gap-2 cursor-pointer"
                                    onClick={() => navigate('/admin/team')}
                                >
                                    <Shield className="h-4 w-4" />
                                    <span>Admin Panel</span>
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                            </>
                        )}

                        <DropdownMenuItem
                            className="flex items-center gap-2 text-red-600 cursor-pointer"
                            onClick={signOut}
                        >
                            <LogOut className="h-4 w-4" />
                            <span>Sign out</span>
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>
        </div>
    );
};

const RootLayout = () => {
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const { userRole, signOut } = useAuth();
    const location = useLocation();

    const toggleSidebar = () => {
        setIsSidebarOpen((prev) => !prev);
    };

    return (
        <div className="flex h-screen bg-gray-50">
            <Sidebar isOpen={isSidebarOpen} toggleSidebar={toggleSidebar} />
            <div className="flex-1 flex flex-col transition-all duration-300">
                <Header toggleSidebar={toggleSidebar} userRole={userRole} signOut={signOut} />
                <main className="flex-1 mt-16 p-4 overflow-auto">
                    <Outlet />
                </main>
            </div>
        </div>
    );
};

export default RootLayout;