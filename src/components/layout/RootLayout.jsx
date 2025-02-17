// src/components/layout/RootLayout.jsx
import React from 'react';
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
    UserCircle
} from 'lucide-react';

const Sidebar = () => {
    const location = useLocation();
    const isActiveRoute = (path) => location.pathname === path;

    return (
        <div className="w-64 bg-[#0a1e46] h-screen flex flex-col">
            <div className="p-4">
                <h1 className="text-white text-2xl font-bold flex items-center gap-2">
                    <LayoutDashboard className="h-6 w-6" />
                    FAULTFIXERS
                </h1>
            </div>

            <nav className="flex-1 px-2">
                {[
                    { name: 'Dashboard', icon: <LayoutDashboard className="h-5 w-5" />, path: '/' },
                    { name: 'My Jobs', icon: <ClipboardList className="h-5 w-5" />, path: '/jobs' },
                    { name: 'Reactive Tickets', icon: <Ticket className="h-5 w-5" />, path: '/tickets' },
                    { name: 'PPM Tasks', icon: <Clock className="h-5 w-5" />, path: '/tasks' },
                    { name: 'Calendar', icon: <CalendarDays className="h-5 w-5" />, path: '/calendar' },
                    { name: 'Buildings', icon: <Building2 className="h-5 w-5" />, path: '/buildings' },
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
                    Use the Mobile App
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

// Header component
const Header = ({ title }) => (
    <div className="bg-blue-600 text-white h-14 flex items-center justify-between px-4">
        <h1 className="text-xl font-semibold">{title}</h1>
        <div className="flex items-center gap-4">
            <Bell className="h-5 w-5" />
            <UserCircle className="h-6 w-6" />
        </div>
    </div>
);

// Root Layout
const RootLayout = ({ children }) => {
    return (
        <div className="flex h-screen">
            <Sidebar />
            <div className="flex-1 flex flex-col">
                <Header title="Reactive Tickets" />
                <main className="flex-1 bg-gray-100 overflow-auto">
                    {children}
                </main>
            </div>
        </div>
    );
};

export default RootLayout;