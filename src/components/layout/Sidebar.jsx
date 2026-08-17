// src/components/layout/Sidebar.jsx
import { RotateCcw } from 'lucide-react';
import ReopenRequestsBadge from '../admin/ReopenRequestsBadge';
import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../auth/AuthProvider';
import PendingApprovalsBadge from '../bookings/PendingApprovalsBadge';
import { useAssets, useGlobalApprovers } from '../bookings/useBookingData';
import {
    LayoutDashboard,
    ClipboardList,
    CalendarDays,
    CalendarPlus,
    CalendarCheck,
    CalendarClock,
    Boxes,
    ShieldCheck,
    MapPin,
    Users,
    BarChart4,
    Activity,
    FolderOpen,
    ChevronDown,
    ChevronRight,
    Check,
    Shield,
    Wrench,
    UserCog
} from 'lucide-react';

const Sidebar = ({ isOpen, toggleSidebar }) => {
    const location = useLocation();
    const { userRole, user, isDatabaseAdmin, canSeeMaintenance } = useAuth();
    const { assets } = useAssets();
    const { approvers: globalApprovers } = useGlobalApprovers();
    const [adminExpanded, setAdminExpanded] = useState(false);
    const [workspaceMenuOpen, setWorkspaceMenuOpen] = useState(false);

    const isActiveRoute = (path) => location.pathname === path;
    const isAdmin = userRole === 'admin';
    const isFullAdmin = userRole === 'admin';

    // Show Approvals only to people who can actually approve something, rather
    // than sending every teacher to an empty queue.
    const isApprover = isDatabaseAdmin
        || !!globalApprovers?.[user?.uid]
        || assets.some((asset) => asset.approvers?.[user?.uid]);

    // Which workspace you are in follows the route, so a deep link or a
    // browser back button never leaves the sidebar showing the wrong nav.
    const activeWorkspace = location.pathname.startsWith('/bookings') ? 'bookings' : 'maintenance';

    const WORKSPACES = {
        maintenance: {
            label: 'Maintenance',
            icon: <Wrench className="w-6 h-6" />,
            home: '/',
            routes: [
                { name: 'Dashboard', icon: <LayoutDashboard className="h-5 w-5" />, path: '/' },
                { name: 'Jobs', icon: <ClipboardList className="h-5 w-5" />, path: '/admin/jobs' },
                { name: 'Tasks', icon: <CalendarDays className="h-5 w-5" />, path: '/admin/calendar' },
            ],
            adminRoutes: [
                { name: 'Analytics', icon: <BarChart4 className="h-5 w-5" />, path: '/admin/analytics' },
                {
                    name: 'Reopen Requests',
                    icon: <RotateCcw className="h-5 w-5" />,
                    path: '/admin/reopen-requests',
                    badge: <ReopenRequestsBadge />
                },
                { name: 'Workload', icon: <Activity className="h-5 w-5" />, path: '/admin/workload' },
                { name: 'Locations', icon: <MapPin className="h-5 w-5" />, path: '/admin/locations' },
                { name: 'Categories', icon: <FolderOpen className="h-5 w-5" />, path: '/admin/categories' },
                { name: 'Team', icon: <Users className="h-5 w-5" />, path: '/admin/team' },
                { name: 'Portal access', icon: <Wrench className="h-5 w-5" />, path: '/admin/access' },
            ],
            fullAdminRoutes: [
                { name: 'Role Manager', icon: <UserCog className="h-5 w-5" />, path: '/admin/roles' }
            ]
        },
        bookings: {
            label: 'Bookings',
            icon: <CalendarPlus className="w-6 h-6" />,
            home: '/bookings',
            routes: [
                { name: 'Book an asset', icon: <CalendarPlus className="h-5 w-5" />, path: '/bookings' },
                { name: 'My bookings', icon: <CalendarCheck className="h-5 w-5" />, path: '/bookings/mine' },
                ...(isApprover ? [{
                    name: 'Approvals',
                    icon: <ShieldCheck className="h-5 w-5" />,
                    path: '/bookings/approvals',
                    badge: <PendingApprovalsBadge />
                }] : []),
            ],
            adminRoutes: [
                { name: 'All bookings', icon: <CalendarClock className="h-5 w-5" />, path: '/bookings/all' },
                { name: 'Bookable assets', icon: <Boxes className="h-5 w-5" />, path: '/bookings/assets' },
                { name: 'Booking approvers', icon: <ShieldCheck className="h-5 w-5" />, path: '/bookings/approvers' },
            ],
            fullAdminRoutes: []
        }
    };

    // Teachers only ever have Bookings, so there is nothing to switch between.
    const availableWorkspaces = canSeeMaintenance ? ['maintenance', 'bookings'] : ['bookings'];
    const workspace = WORKSPACES[availableWorkspaces.includes(activeWorkspace) ? activeWorkspace : 'bookings'];

    const generalRoutes = workspace.routes;
    const adminRoutes = workspace.adminRoutes;
    const fullAdminRoutes = workspace.fullAdminRoutes;

    const toggleAdminSection = () => {
        setAdminExpanded(!adminExpanded);
    };

    return (
        <div
            className={`fixed top-0 left-0 h-screen w-64 bg-[#0a1e46] flex flex-col transition-transform duration-300
                        ${isOpen ? 'translate-x-0' : '-translate-x-full'}
                        z-50 shadow-lg custom-scrollbar overflow-y-auto`}
        >
            <div className="p-4 flex justify-between items-start gap-2">
                {/* Workspace switcher. One school, two systems - swap between them
                    here rather than showing both navs at once. */}
                <div className="relative flex-1 min-w-0">
                    <button
                        onClick={() => availableWorkspaces.length > 1 && setWorkspaceMenuOpen((v) => !v)}
                        disabled={availableWorkspaces.length === 1}
                        className={`flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-white ${availableWorkspaces.length > 1 ? 'hover:bg-blue-900/50' : 'cursor-default'
                            }`}
                    >
                        {workspace.icon}
                        <span className="truncate text-lg font-bold">{workspace.label}</span>
                        {availableWorkspaces.length > 1 && (
                            <ChevronDown className={`ml-auto h-4 w-4 shrink-0 transition-transform ${workspaceMenuOpen ? 'rotate-180' : ''
                                }`} />
                        )}
                    </button>

                    {workspaceMenuOpen && (
                        <div className="absolute left-0 right-0 z-50 mt-1 overflow-hidden rounded-lg border border-blue-900 bg-[#12327A] shadow-xl">
                            {availableWorkspaces.map((key) => (
                                <Link
                                    key={key}
                                    to={WORKSPACES[key].home}
                                    onClick={() => setWorkspaceMenuOpen(false)}
                                    className={`flex items-center gap-2 px-3 py-2.5 text-sm ${key === activeWorkspace
                                        ? 'bg-blue-600 text-white'
                                        : 'text-gray-200 hover:bg-blue-700/60'
                                        }`}
                                >
                                    {WORKSPACES[key].icon}
                                    <span>{WORKSPACES[key].label}</span>
                                    {key === activeWorkspace && <Check className="ml-auto h-4 w-4" />}
                                </Link>
                            ))}
                        </div>
                    )}
                </div>

                <button
                    onClick={toggleSidebar}
                    className="mt-1 shrink-0 text-white hover:bg-blue-900/50 rounded-full p-1"
                >
                    <ChevronRight className="h-5 w-5" />
                </button>
            </div>

            <nav className="flex-1 px-2 py-4">
                <div className="mb-4">
                    {generalRoutes.map((item) => (
                        <Link
                            key={item.path}
                            to={item.path}
                            className={`flex items-center justify-between px-4 py-2 mt-1 rounded-lg text-sm ${isActiveRoute(item.path)
                                ? 'bg-blue-600 text-white'
                                : 'text-gray-300 hover:bg-blue-700/50'
                                }`}
                        >
                            <div className="flex items-center gap-3">
                                {item.icon}
                                {item.name}
                            </div>
                            {item.badge && item.badge}
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
                                        className={`flex items-center justify-between px-4 py-2 mt-1 rounded-lg text-sm ${isActiveRoute(item.path)
                                            ? 'bg-blue-600 text-white'
                                            : 'text-gray-300 hover:bg-blue-700/50'
                                            }`}
                                    >
                                        <div className="flex items-center gap-3">
                                            {item.icon}
                                            {item.name}
                                        </div>
                                        {item.badge && item.badge}
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