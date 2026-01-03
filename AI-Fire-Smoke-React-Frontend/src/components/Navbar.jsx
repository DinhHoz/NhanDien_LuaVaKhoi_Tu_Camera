import { Link, useNavigate, useLocation } from "react-router-dom";
import {
    FiBell,
    FiLogOut,
    FiHome,
    FiVideo,
    FiAlertCircle,
    FiUsers,
    FiSettings,
    FiMenu,
    FiX,
} from "react-icons/fi";
import { signOut } from "firebase/auth";
import { auth } from "../firebase";
import { useAuth } from "../contexts/AuthContext";
import { useNotifications } from "../contexts/NotificationContext";
import { useState, useEffect, useRef } from "react";

export default function Navbar() {
    const navigate = useNavigate();
    const location = useLocation();
    const { currentUser, role } = useAuth();
    const { unreadCount } = useNotifications();
    const [isAdminMenuOpen, setIsAdminMenuOpen] = useState(false);
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [isScrolled, setIsScrolled] = useState(false);
    const [notificationRing, setNotificationRing] = useState(false);
    const dropdownRef = useRef(null);
    const prevUnreadCount = useRef(unreadCount);

    const handleLogout = async () => {
        try {
            await signOut(auth);
            console.log("✅ Đăng xuất thành công");
            localStorage.clear();
            navigate("/login");
        } catch (error) {
            console.error("❌ Lỗi khi đăng xuất:", error);
        }
    };

    const isActive = (path) => location.pathname === path;

    // Scroll effect
    useEffect(() => {
        const handleScroll = () => {
            setIsScrolled(window.scrollY > 20);
        };

        window.addEventListener("scroll", handleScroll);
        return () => window.removeEventListener("scroll", handleScroll);
    }, []);

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsAdminMenuOpen(false);
            }
        };

        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    // Ring notification bell on new notification
    useEffect(() => {
        if (unreadCount > prevUnreadCount.current && prevUnreadCount.current !== 0) {
            setNotificationRing(true);
            setTimeout(() => setNotificationRing(false), 600);
        }
        prevUnreadCount.current = unreadCount;
    }, [unreadCount]);

    // Close mobile menu when clicking a link
    const handleMobileLinkClick = () => {
        setIsMobileMenuOpen(false);
    };

    return (
        <>
            <nav
                className={`sticky top-0 z-50 transition-all duration-300 ${isScrolled
                    ? "bg-white/95 backdrop-blur-xl shadow-lg border-b border-gray-200/50"
                    : "bg-white/90 backdrop-blur-md shadow-md border-b border-gray-200"
                    }`}
            >
                <div className="container mx-auto flex justify-between items-center px-4 sm:px-6 py-3">
                    {/* Logo */}
                    <Link
                        to="/dashboard"
                        className="group flex items-center gap-2 text-xl font-bold transition-all"
                    >
                        <div className="relative">
                            <img
                                src="/rabbit-fire-logo.png"
                                alt="RabbitFire Logo"
                                className="h-10 w-10 object-contain transform group-hover:scale-110 transition-transform duration-300"
                            />
                            <div className="absolute inset-0 bg-orange-500 opacity-0 group-hover:opacity-20 blur-xl transition-opacity duration-300" />
                        </div>
                        <span className="bg-gradient-to-r from-orange-500 via-red-500 to-pink-500 bg-clip-text text-transparent group-hover:from-pink-500 group-hover:via-red-500 group-hover:to-orange-500 transition-all duration-500 bg-[length:200%_100%] group-hover:bg-right bg-left">
                            RabbitFire
                        </span>
                    </Link>

                    {/* Desktop Navigation Links */}
                    <div className="hidden lg:flex items-center gap-2">
                        <NavLink to="/dashboard" icon={FiHome} active={isActive("/dashboard")}>
                            Dashboard
                        </NavLink>
                        <NavLink to="/cameras" icon={FiVideo} active={isActive("/cameras")}>
                            Cameras
                        </NavLink>
                        <NavLink to="/alert" icon={FiAlertCircle} active={isActive("/alert")}>
                            Cảnh báo
                        </NavLink>

                        {/* Admin Dropdown */}
                        {role === "admin" && (
                            <div className="relative" ref={dropdownRef}>
                                <button
                                    onClick={() => setIsAdminMenuOpen(!isAdminMenuOpen)}
                                    className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-medium transition-all duration-300 ${location.pathname.startsWith("/admin")
                                        ? "bg-gradient-to-r from-indigo-500 to-purple-600 text-white shadow-lg shadow-indigo-500/30"
                                        : "text-gray-700 hover:bg-gradient-to-r hover:from-indigo-50 hover:to-purple-50 hover:text-indigo-700"
                                        }`}
                                >
                                    <FiSettings size={18} />
                                    <span>Quản trị</span>
                                    <svg
                                        className={`w-4 h-4 transition-transform duration-300 ${isAdminMenuOpen ? "rotate-180" : ""
                                            }`}
                                        fill="none"
                                        stroke="currentColor"
                                        viewBox="0 0 24 24"
                                    >
                                        <path
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            strokeWidth={2}
                                            d="M19 9l-7 7-7-7"
                                        />
                                    </svg>
                                </button>

                                {/* Dropdown Menu */}
                                {isAdminMenuOpen && (
                                    <div className="absolute top-full right-0 mt-2 w-56 bg-white/95 backdrop-blur-xl rounded-2xl shadow-2xl border border-gray-200/50 overflow-hidden animate-slideDown">
                                        <Link
                                            to="/admin/users"
                                            onClick={() => setIsAdminMenuOpen(false)}
                                            className="flex items-center gap-3 px-5 py-3.5 hover:bg-gradient-to-r hover:from-indigo-50 hover:to-purple-50 transition-all duration-200 group"
                                        >
                                            <FiUsers
                                                size={20}
                                                className="text-indigo-600 group-hover:scale-110 transition-transform"
                                            />
                                            <span className="text-gray-700 font-medium group-hover:text-indigo-700">
                                                Quản lý Users
                                            </span>
                                        </Link>
                                        <div className="h-px bg-gradient-to-r from-transparent via-gray-200 to-transparent" />
                                        <Link
                                            to="/admin/cameras"
                                            onClick={() => setIsAdminMenuOpen(false)}
                                            className="flex items-center gap-3 px-5 py-3.5 hover:bg-gradient-to-r hover:from-indigo-50 hover:to-purple-50 transition-all duration-200 group"
                                        >
                                            <FiVideo
                                                size={20}
                                                className="text-indigo-600 group-hover:scale-110 transition-transform"
                                            />
                                            <span className="text-gray-700 font-medium group-hover:text-indigo-700">
                                                Quản lý Cameras
                                            </span>
                                        </Link>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Right Section */}
                    <div className="flex items-center gap-3 sm:gap-4">
                        {/* Notifications */}
                        <Link
                            to="/notifications"
                            className={`relative p-2.5 rounded-xl hover:bg-gradient-to-r hover:from-blue-50 hover:to-indigo-50 transition-all duration-300 group ${notificationRing ? "animate-ring" : ""
                                }`}
                        >
                            <FiBell
                                size={22}
                                className="text-gray-700 group-hover:text-blue-600 transition-colors"
                            />
                            {unreadCount > 0 && (
                                <>
                                    <span className="absolute -top-1 -right-1 bg-gradient-to-r from-red-500 to-pink-500 text-white text-xs font-bold rounded-full h-6 min-w-[24px] px-1.5 flex items-center justify-center shadow-lg animate-pulseGlow">
                                        {unreadCount > 9 ? "9+" : unreadCount}
                                    </span>
                                    <span className="absolute -top-1 -right-1 h-6 w-6 bg-red-500 rounded-full opacity-30 animate-ping" />
                                </>
                            )}
                        </Link>

                        {/* User Email - Desktop Only */}
                        {currentUser && (
                            <div className="hidden md:flex items-center gap-2 px-3 py-1.5 bg-gradient-to-r from-gray-50 to-gray-100 rounded-lg border border-gray-200">
                                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-semibold text-sm shadow-md">
                                    {currentUser.email?.charAt(0).toUpperCase() || "U"}
                                </div>
                                <span className="text-sm text-gray-700 font-medium max-w-[150px] truncate">
                                    {currentUser.email}
                                </span>
                            </div>
                        )}

                        {/* Logout - Desktop */}
                        <button
                            onClick={handleLogout}
                            className="hidden sm:flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-red-50 to-pink-50 text-red-600 rounded-xl hover:from-red-100 hover:to-pink-100 hover:shadow-lg transition-all duration-300 font-medium group"
                        >
                            <FiLogOut
                                size={18}
                                className="group-hover:translate-x-0.5 transition-transform"
                            />
                            <span>Đăng xuất</span>
                        </button>

                        {/* Mobile Menu Button */}
                        <button
                            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                            className="lg:hidden p-2.5 rounded-xl hover:bg-gray-100 transition-colors"
                            aria-label="Toggle menu"
                        >
                            {isMobileMenuOpen ? (
                                <FiX size={24} className="text-gray-700" />
                            ) : (
                                <FiMenu size={24} className="text-gray-700" />
                            )}
                        </button>
                    </div>
                </div>
            </nav>

            {/* Mobile Menu */}
            {isMobileMenuOpen && (
                <>
                    {/* Backdrop */}
                    <div
                        className="fixed inset-0 bg-black/30 backdrop-blur-sm z-40 lg:hidden animate-fadeIn"
                        onClick={() => setIsMobileMenuOpen(false)}
                    />

                    {/* Menu Panel */}
                    <div className="fixed top-0 right-0 h-full w-80 max-w-[85vw] bg-white/95 backdrop-blur-xl shadow-2xl z-50 lg:hidden animate-slideIn">
                        <div className="flex flex-col h-full">
                            {/* Header */}
                            <div className="flex items-center justify-between p-6 border-b border-gray-200">
                                <h2 className="text-xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                                    Menu
                                </h2>
                                <button
                                    onClick={() => setIsMobileMenuOpen(false)}
                                    className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
                                >
                                    <FiX size={24} className="text-gray-700" />
                                </button>
                            </div>

                            {/* User Info */}
                            {currentUser && (
                                <div className="p-6 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-indigo-50">
                                    <div className="flex items-center gap-3">
                                        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-bold text-lg shadow-lg">
                                            {currentUser.email?.charAt(0).toUpperCase() || "U"}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm text-gray-600 font-medium">
                                                Đăng nhập với
                                            </p>
                                            <p className="text-gray-800 font-semibold truncate">
                                                {currentUser.email}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Navigation Links */}
                            <div className="flex-1 overflow-y-auto p-4">
                                <div className="space-y-2">
                                    <MobileNavLink
                                        to="/dashboard"
                                        icon={FiHome}
                                        active={isActive("/dashboard")}
                                        onClick={handleMobileLinkClick}
                                    >
                                        Dashboard
                                    </MobileNavLink>
                                    <MobileNavLink
                                        to="/cameras"
                                        icon={FiVideo}
                                        active={isActive("/cameras")}
                                        onClick={handleMobileLinkClick}
                                    >
                                        Cameras
                                    </MobileNavLink>
                                    <MobileNavLink
                                        to="/alert"
                                        icon={FiAlertCircle}
                                        active={isActive("/alert")}
                                        onClick={handleMobileLinkClick}
                                    >
                                        Cảnh báo
                                    </MobileNavLink>
                                    <MobileNavLink
                                        to="/notifications"
                                        icon={FiBell}
                                        active={isActive("/notifications")}
                                        onClick={handleMobileLinkClick}
                                        badge={unreadCount}
                                    >
                                        Thông báo
                                    </MobileNavLink>

                                    {/* Admin Section */}
                                    {role === "admin" && (
                                        <>
                                            <div className="pt-4 pb-2">
                                                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider px-4">
                                                    Quản trị
                                                </p>
                                            </div>
                                            <MobileNavLink
                                                to="/admin/users"
                                                icon={FiUsers}
                                                active={isActive("/admin/users")}
                                                onClick={handleMobileLinkClick}
                                            >
                                                Quản lý Users
                                            </MobileNavLink>
                                            <MobileNavLink
                                                to="/admin/cameras"
                                                icon={FiVideo}
                                                active={isActive("/admin/cameras")}
                                                onClick={handleMobileLinkClick}
                                            >
                                                Quản lý Cameras
                                            </MobileNavLink>
                                        </>
                                    )}
                                </div>
                            </div>

                            {/* Footer - Logout */}
                            <div className="p-4 border-t border-gray-200">
                                <button
                                    onClick={() => {
                                        handleLogout();
                                        setIsMobileMenuOpen(false);
                                    }}
                                    className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-red-500 to-pink-500 text-white rounded-xl hover:shadow-lg transition-all duration-300 font-medium"
                                >
                                    <FiLogOut size={20} />
                                    <span>Đăng xuất</span>
                                </button>
                            </div>
                        </div>
                    </div>
                </>
            )}
        </>
    );
}

// Desktop NavLink Component
function NavLink({ to, icon: Icon, active, children }) {
    return (
        <Link
            to={to}
            className={`group relative flex items-center gap-2 px-4 py-2.5 rounded-xl font-medium transition-all duration-300 ${active
                ? "bg-gradient-to-r from-blue-500 to-indigo-600 text-white shadow-lg shadow-blue-500/30"
                : "text-gray-700 hover:bg-gradient-to-r hover:from-blue-50 hover:to-indigo-50 hover:text-blue-700"
                }`}
        >
            <Icon size={18} className={`transition-transform ${active ? "" : "group-hover:scale-110"}`} />
            <span>{children}</span>
            {active && (
                <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-1/2 h-0.5 bg-white rounded-full" />
            )}
        </Link>
    );
}

// Mobile NavLink Component
function MobileNavLink({ to, icon: Icon, active, children, onClick, badge }) {
    return (
        <Link
            to={to}
            onClick={onClick}
            className={`flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-all duration-200 ${active
                ? "bg-gradient-to-r from-blue-500 to-indigo-600 text-white shadow-lg"
                : "text-gray-700 hover:bg-gradient-to-r hover:from-blue-50 hover:to-indigo-50 hover:text-blue-700"
                }`}
        >
            <Icon size={20} />
            <span className="flex-1">{children}</span>
            {badge > 0 && (
                <span className="bg-red-500 text-white text-xs font-bold rounded-full h-6 min-w-[24px] px-2 flex items-center justify-center">
                    {badge > 9 ? "9+" : badge}
                </span>
            )}
        </Link>
    );
}
