// src/components/layout/RootLayout.jsx
import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
    LayoutDashboard,
    ClipboardList,
    CalendarDays,
    MapPin,
    Users,
    Smartphone,
    HelpCircle,
    Bell,
    UserCircle,
    Activity,
    BarChart4,
    Drill,
    Wrench,
    FolderOpen
} from 'lucide-react';
import NotificationBell from '../NotificationBell';

// Sidebar Toggle Button Component
const SidebarToggle = ({ toggleSidebar }) => (
    <button onClick={toggleSidebar} className="text-white focus:outline-none">
        <Wrench className="w-6 h-6" />
    </button>
);

const Sidebar = ({ isOpen, toggleSidebar }) => {
    const location = useLocation();
    const isActiveRoute = (path) => location.pathname === path;

    return (
        <div
            className={`fixed top-0 left-0 h-screen w-64 bg-[#0a1e46] flex flex-col transition-transform duration-300
                        ${isOpen ? 'translate-x-0 pointer-events-auto' : '-translate-x-full pointer-events-none'}
                        z-50 shadow-lg`}
        >
            <div className="p-4 flex justify-between items-center">
                <h1 className="text-white text-2xl font-bold flex items-center gap-2">
                    <SidebarToggle toggleSidebar={toggleSidebar} />
                </h1>

            </div>

            <nav className="flex-1 px-2">
                {[
                    { name: 'Dashboard', icon: <LayoutDashboard className="h-5 w-5" />, path: '/' },
                    { name: 'Jobs', icon: <ClipboardList className="h-5 w-5" />, path: '/admin/jobs' },
                    { name: 'Analytics', icon: <BarChart4 className="h-5 w-5" />, path: '/admin/analytics' },
                    { name: 'Tasks', icon: <CalendarDays className="h-5 w-5" />, path: '/admin/calendar' },
                    { name: 'Workload', icon: <Activity className="h-5 w-5" />, path: '/admin/workload' },
                    { name: 'Locations', icon: <MapPin className="h-5 w-5" />, path: '/admin/locations' },
                    {
                        name: 'Categories', icon: <FolderOpen className="h-5 w-5" />, path: '/admin/categories'
                    },
                    { name: 'Team', icon: <Users className="h-5 w-5" />, path: '/admin/team' },
                ].map((item) => (
                    <Link
                        key={item.path}
                        to={item.path}
                        className={`flex items-center gap-3 px-4 py-2 mt-1 rounded-lg text-sm ${isActiveRoute(item.path)
                            ? 'bg-blue-600 text-white'
                            : 'text-gray-300 hover:bg-blue-700/50'
                            }`}
                    >
                        {item.icon}
                        {item.name}
                    </Link>
                ))}
            </nav>

            <div className="p-4">
                <Link to="/mobile" className="flex items-center gap-3 px-4 py-2 text-gray-300 hover:bg-blue-700/50 rounded-lg text-sm">
                    <Smartphone className="h-5 w-5" />
                    Mobile App
                </Link>
                <Link to="/help" className="flex items-center gap-3 px-4 py-2 text-gray-300 hover:bg-blue-700/50 rounded-lg text-sm">
                    <HelpCircle className="h-5 w-5" />
                    Help
                </Link>
            </div>
        </div>
    );
};

const Header = ({ toggleSidebar }) => (
    <div className="bg-[#0a1e46] text-white h-16 flex items-center justify-between px-6 shadow-lg fixed top-0 right-0 left-0 z-40">
        {/* Sidebar toggle button */}
        <SidebarToggle toggleSidebar={toggleSidebar} />

        {/* Centered logo and title */}
        <div className="absolute left-1/2 -translate-x-1/2 flex items-center gap-4">
            <img src="/school-maintenance/school-logo2.png" alt="SJMC Logo" className="h-12" />
            <div className="flex flex-col text-center">
                <h1 className="text-xl font-semibold">SJMC Maintenance Portal</h1>
            </div>
        </div>

        {/* Icons on the right */}
        <div className="flex items-center gap-4">
            <NotificationBell userRole={currentUser.role} />
            <UserCircle className="h-6 w-6" />
        </div>
    </div>
);

const RootLayout = ({ children }) => {
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);

    const toggleSidebar = () => {
        setIsSidebarOpen((prev) => !prev);
    };

    return (
        <div className="flex h-screen bg-gray-50">
            <Sidebar isOpen={isSidebarOpen} toggleSidebar={toggleSidebar} />
            <div className={`flex-1 flex flex-col transition-all duration-300 ${isSidebarOpen ? 'ml-64' : 'ml-0'}`}>
                <Header toggleSidebar={toggleSidebar} />
                <main className="flex-1 mt-16 p-4 overflow-auto">{children}</main>
            </div>
        </div>
    );
};

export default RootLayout;