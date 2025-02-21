import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
    LayoutDashboard,
    Ticket,
    CalendarDays,
    Building2,
    MapPin,
    Clock,
    ClipboardList,
    Users,
    Settings,
    Smartphone,
    HelpCircle,
    Bell,
    UserCircle,
    Activity
} from 'lucide-react';
import { BarChart4 } from 'lucide-react';

const Sidebar = ({ isOpen, toggleSidebar }) => {
    const location = useLocation();
    const isActiveRoute = (path) => location.pathname === path;

    return (
        <div className={`w-64 bg-[#0a1e46] h-screen flex flex-col transform transition-transform duration-300 ${isOpen ? 'translate-x-0' : '-translate-x-full'}`}>
            <div className="p-4">
                <h1 className="text-white text-2xl font-bold flex items-center gap-2">
                    <LayoutDashboard className="h-6 w-6" />
                    Admin
                </h1>
            </div>

            <nav className="flex-1 px-2">
                {[
                    { name: 'Dashboard', icon: <LayoutDashboard className="h-5 w-5" />, path: '/' },
                    { name: 'Jobs', icon: <ClipboardList className="h-5 w-5" />, path: '/jobs' },
                    { name: 'Analytics', icon: <BarChart4 className="h-5 w-5" />, path: '/tasks' },
                    { name: 'Calendar', icon: <CalendarDays className="h-5 w-5" />, path: '/calendar' },
                    { name: 'Workload', icon: <Activity className="h-5 w-5" />, path: '/buildings' },
                    { name: 'Locations', icon: <MapPin className="h-5 w-5" />, path: '/locations' },
                    { name: 'Team', icon: <Users className="h-5 w-5" />, path: '/team' },
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
                <Link
                    to="/mobile"
                    className="flex items-center gap-3 px-4 py-2 text-gray-300 hover:bg-blue-700/50 rounded-lg text-sm"
                >
                    <Smartphone className="h-5 w-5" />
                    Mobile App
                </Link>
                <Link
                    to="/help"
                    className="flex items-center gap-3 px-4 py-2 text-gray-300 hover:bg-blue-700/50 rounded-lg text-sm"
                >
                    <HelpCircle className="h-5 w-5" />
                    Help
                </Link>
            </div>
        </div>
    );
};

const Header = ({ title, toggleSidebar }) => (
    <div className="bg-marist text-white h-16 flex items-center justify-between px-6 shadow-lg fixed top-0 right-0 left-0 z-10">
        <div className="flex items-center gap-4">
            <button onClick={toggleSidebar} className="text-white">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16"></path>
                </svg>
            </button>
            <img
                src="/school-logo2.png"
                alt="SJMC Logo"
                className="h-10"
            />
            <div className="flex flex-col">
                <h1 className="text-xl font-semibold">SJMC Maintenance Portal</h1>
            </div>
        </div>
        <div className="flex items-center gap-4">
            <Bell className="h-5 w-5" />
            <UserCircle className="h-6 w-6" />
        </div>
    </div>
);

const RootLayout = ({ children }) => {
    const [isSidebarOpen, setIsSidebarOpen] = useState(true);

    const toggleSidebar = () => {
        setIsSidebarOpen(!isSidebarOpen);
    };

    return (
        <div className="flex h-screen bg-gray-50">
            <Sidebar isOpen={isSidebarOpen} toggleSidebar={toggleSidebar} />
            <div className="flex-1 flex flex-col">
                <Header toggleSidebar={toggleSidebar} />
                <main className="flex-1 relative">
                    {children}
                </main>
            </div>
        </div>
    );
};

export default RootLayout;