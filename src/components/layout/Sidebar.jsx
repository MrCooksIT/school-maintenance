// src/components/layout/Sidebar.jsx
import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../auth/AuthProvider';
import {
    LayoutDashboard,
    ClipboardList,
    CalendarDays,
    MapPin,
    Users,
    BarChart4,
    Activity,
    FolderOpen,
    ChevronDown,
    ChevronRight,
    Shield,
    Wrench,
    UserCog
} from 'lucide-react';

const Sidebar = ({ isOpen, toggleSidebar }) => {
    const location = useLocation();
    const { userRole } = useAuth();
    const [adminExpanded, setAdminExpanded] = useState(false);

    const isActiveRoute = (path) => location.pathname === path;
    const isAdmin = userRole === 'admin' || userRole === 'supervisor';
    const isFullAdmin = userRole === 'admin';

    // General routes accessible to all authenticated users
    const generalRoutes = [
        { name: 'Dashboard', icon: <LayoutDashboard className="h-5 w-5" />, path: '/' },
        { name: 'Jobs', icon: <ClipboardList className="h-5 w-5" />, path: '/admin/jobs' },
        { name: 'Tasks', icon: <CalendarDays className="h-5 w-5" />, path: '/admin/calendar' },
    ];

    // Admin-only routes
    const adminRoutes = [
        { name: 'Analytics', icon: <BarChart4 className="h-5 w-5" />, path: '/admin/analytics' },
        { name: 'Workload', icon: <Activity className="h-5 w-5" />, path: '/admin/workload' },
        { name: 'Locations', icon: <MapPin className="h-5 w-5" />, path: '/admin/locations' },
        { name: 'Categories', icon: <FolderOpen className="h-5 w-5" />, path: '/admin/categories' },
        { name: 'Team', icon: <Users className="h-5 w-5" />, path: '/admin/team' },
    ];

    // Full admin only routes
    const fullAdminRoutes = [
        { name: 'Role Manager', icon: <UserCog className="h-5 w-5" />, path: '/admin/roles' }
    ];

    const toggleAdminSection = () => {
        setAdminExpanded(!adminExpanded);
    };

    return (
        <div
            className={`fixed top-0 left-0 h-screen w-64 bg-[#0a1e46] flex flex-col transition-transform duration-300
                        ${isOpen ? 'translate-x-0' : '-translate-x-full'}
                        z-50 shadow-lg custom-scrollbar overflow-y-auto`}
        >
            <div className="p-4 flex justify-between items-center">
                <h1 className="text-white text-2xl font-bold flex items-center gap-2">
                    <Wrench className="w-6 h-6" />
                    <span className="text-lg">Maintenance</span>
                </h1>
                <button
                    onClick={toggleSidebar}
                    className="text-white hover:bg-blue-900/50 rounded-full p-1"
                >
                    <ChevronRight className="h-5 w-5" />
                </button>
            </div>

            <nav className="flex-1 px-2 py-4">
                {/* Standard Menu Items */}
                <div className="mb-4">
                    {generalRoutes.map((item) => (
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
                </div>

                {/* Admin Section - Only visible to admins */}
                {isAdmin && (
                    <div className="mb-4">
                        <button
                            onClick={toggleAdminSection}
                            className="flex items-center justify-between w-full px-4 py-2 text-left rounded-lg text-gray-300 hover:bg-blue-700/50"
                        >
                            <div className="flex items-center gap-3">
                                <Shield className="h-5 w-5" />
                                <span className="text-sm font-medium">Admin</span>
                            </div>
                            {adminExpanded ? (
                                <ChevronDown className="h-4 w-4" />
                            ) : (
                                <ChevronRight className="h-4 w-4" />
                            )}
                        </button>

                        {/* Admin Submenu - Only visible when expanded */}
                        {adminExpanded && (
                            <div className="ml-4 pl-2 border-l border-blue-800">
                                {/* Regular admin routes */}
                                {adminRoutes.map((item) => (
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

                                {/* Full admin only routes */}
                                {isFullAdmin && fullAdminRoutes.map((item) => (
                                    <Link
                                        key={item.path}
                                        to={item.path}
                                        className={`flex items-center gap-3 px-4 py-2 mt-1 rounded-lg text-sm ${isActiveRoute(item.path)
                                            ? 'bg-blue-600 text-white'
                                            : 'text-gray-300 hover:bg-blue-700/50'
                                            }`}
                                    >
                                        {item.icon}
                                        <div className="flex items-center">
                                            {item.name}
                                            <span className="ml-1 px-1 py-0.5 bg-yellow-500 text-black rounded text-xs">Admin</span>
                                        </div>
                                    </Link>
                                ))}
                            </div>
                        )}
                    </div>
                )}
            </nav>

            <div className="p-4 border-t border-blue-900">
                <div className="flex items-center px-4 py-2">
                    <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white font-bold mr-3">
                        {userRole === 'admin' ? 'A' : userRole === 'supervisor' ? 'S' : 'U'}
                    </div>
                    <div>
                        <p className="text-white text-sm">
                            {userRole === 'admin' ? 'Admin' :
                                userRole === 'supervisor' ? 'Supervisor' : 'Staff'}
                        </p>
                        <p className="text-gray-400 text-xs">Role: {userRole}</p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Sidebar;