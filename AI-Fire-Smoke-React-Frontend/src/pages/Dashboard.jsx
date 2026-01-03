import Layout from "../components/Layout";
import { useAuth } from "../contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import {
    FiCamera,
    FiBell,
    FiDatabase,
    FiSettings,
    FiUsers,
    FiVideo,
} from "react-icons/fi";
import { Toaster } from "react-hot-toast";
import { useNotifications } from "../contexts/NotificationContext";

export default function Dashboard() {
    const { role } = useAuth();
    const { unreadCount } = useNotifications();
    const navigate = useNavigate();

    const baseFeatures = [
        {
            icon: <FiCamera size={52} />,
            label: "Xem Camera",
            gradient: "from-blue-500 to-cyan-500",
            path: "/cameras",
            description: "Theo dõi camera trực tiếp"
        },
        {
            icon: (
                <div className="relative flex items-center justify-center">
                    <FiBell size={52} />
                    {unreadCount > 0 && (
                        <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs font-bold rounded-full h-6 min-w-[24px] px-1.5 flex items-center justify-center shadow-lg animate-pulse">
                            {unreadCount > 99 ? "99+" : unreadCount}
                        </span>
                    )}
                </div>
            ),
            label: "Thông báo",
            gradient: "from-cyan-500 to-blue-400",
            path: "/notifications",
            description: "Xem các thông báo mới"
        },
        {
            icon: <FiDatabase size={52} />,
            label: "Nhật ký",
            gradient: "from-indigo-500 to-purple-500",
            path: "/alert",
            description: "Lịch sử phát hiện cháy/khói"
        },
    ];

    const adminFeatures = [
        {
            icon: <FiUsers size={52} />,
            label: "Quản lý Users",
            gradient: "from-pink-500 to-rose-500",
            path: "/admin/users",
            description: "Quản lý người dùng"
        },

        {
            icon: <FiVideo size={52} />,
            label: "Quản lý Cameras",
            gradient: "from-violet-500 to-purple-600",
            path: "/admin/cameras",
            description: "Quản lý camera trong hệ thống"
        },

    ];

    const features =
        role === "admin" ? [...baseFeatures, ...adminFeatures] : baseFeatures;

    const handleFeatureClick = (f) => {
        if (
            ["Quản lý Users", "Quản lý Cameras"].includes(f.label) &&
            role !== "admin"
        ) {
            alert("Bạn không có quyền truy cập chức năng này.");
            return;
        }
        navigate(f.path);
    };

    return (
        <Layout>
            <div className="relative z-10">
                {/* Welcome Section */}
                <div className="text-center mb-12">
                    <h1 className="text-5xl uppercase font-bold bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 bg-clip-text text-transparent mb-3 animate-fadeIn">
                        RabbitFire Dashboard
                    </h1>
                    <p className="text-gray-600 text-lg">
                        Hệ thống giám sát phát hiện cháy & khói thông minh
                    </p>
                </div>

                {/* Feature Cards Grid - Base Features */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
                    {baseFeatures.map((f, i) => (
                        <button
                            key={i}
                            onClick={() => handleFeatureClick(f)}
                            className="group relative overflow-hidden"
                        >
                            {/* Glassmorphism Card */}
                            <div className="relative backdrop-blur-xl bg-white/80 border border-white/40 rounded-3xl p-8 shadow-2xl hover:shadow-3xl transition-all duration-500 hover:-translate-y-3 hover:scale-[1.02]">
                                {/* Gradient Background on Hover */}
                                <div className={`absolute inset-0 bg-gradient-to-br ${f.gradient} opacity-0 group-hover:opacity-15 transition-opacity duration-500 rounded-3xl`} />

                                {/* Icon Container */}
                                <div className={`relative w-28 h-28 mx-auto mb-5 rounded-2xl bg-gradient-to-br ${f.gradient} flex items-center justify-center transform group-hover:rotate-12 group-hover:scale-110 transition-all duration-500 shadow-lg group-hover:shadow-2xl`}>
                                    <div className="text-white transform group-hover:scale-110 transition-transform duration-300">
                                        {f.icon}
                                    </div>
                                    {/* Icon Glow */}
                                    <div className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 blur-xl bg-gradient-to-br ${f.gradient}" />
                                </div>

                                {/* Text Content */}
                                <h3 className="text-xl font-bold text-gray-800 mb-2 group-hover:text-gray-900 transition-colors">
                                    {f.label}
                                </h3>
                                <p className="text-sm text-gray-600 group-hover:text-gray-700 transition-colors">
                                    {f.description}
                                </p>

                                {/* Shimmer Effect */}
                                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000 ease-in-out rounded-3xl" />
                            </div>
                        </button>
                    ))}
                </div>

                {/* Admin Features - 2 bên với khoảng trống giữa */}
                {role === "admin" && (
                    <div className="flex justify-between gap-6 max-w-6xl mx-auto mt-6">
                        {adminFeatures.map((f, i) => (
                            <button
                                key={i}
                                onClick={() => handleFeatureClick(f)}
                                className={`group relative overflow-hidden flex-1 max-w-[calc(33.333%-12px)] ${i === 0 ? 'translate-x-[50%]' : '-translate-x-[50%]'
                                    }`}
                            >
                                {/* Glassmorphism Card */}
                                <div className="relative backdrop-blur-xl bg-white/80 border border-white/40 rounded-3xl p-8 shadow-2xl hover:shadow-3xl transition-all duration-500 hover:-translate-y-3 hover:scale-[1.02]">
                                    {/* Gradient Background on Hover */}
                                    <div className={`absolute inset-0 bg-gradient-to-br ${f.gradient} opacity-0 group-hover:opacity-15 transition-opacity duration-500 rounded-3xl`} />

                                    {/* Icon Container */}
                                    <div className={`relative w-28 h-28 mx-auto mb-5 rounded-2xl bg-gradient-to-br ${f.gradient} flex items-center justify-center transform group-hover:rotate-12 group-hover:scale-110 transition-all duration-500 shadow-lg group-hover:shadow-2xl`}>
                                        <div className="text-white transform group-hover:scale-110 transition-transform duration-300">
                                            {f.icon}
                                        </div>
                                        {/* Icon Glow */}
                                        <div className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 blur-xl bg-gradient-to-br ${f.gradient}" />
                                    </div>

                                    {/* Text Content */}
                                    <h3 className="text-xl font-bold text-gray-800 mb-2 group-hover:text-gray-900 transition-colors">
                                        {f.label}
                                    </h3>
                                    <p className="text-sm text-gray-600 group-hover:text-gray-700 transition-colors">
                                        {f.description}
                                    </p>

                                    {/* Shimmer Effect */}
                                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000 ease-in-out rounded-3xl" />
                                </div>
                            </button>
                        ))}
                    </div>
                )}\n\n                {/* Quick Stats */}
                <div className="mt-12 max-w-4xl mx-auto">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="group backdrop-blur-xl bg-white/70 border border-white/40 rounded-2xl p-6 shadow-xl hover:shadow-2xl transition-all duration-300 hover:-translate-y-1 overflow-hidden relative">
                            <div className="relative z-10 flex items-center justify-between">
                                <div>
                                    <p className="text-sm text-gray-600 font-medium mb-1">Hệ thống</p>
                                    <p className="text-3xl font-bold text-green-600">Hoạt động</p>
                                </div>
                                <div className="w-14 h-14 rounded-full bg-gradient-to-br from-green-100 to-emerald-100 flex items-center justify-center shadow-lg">
                                    <div className="w-4 h-4 rounded-full bg-green-500 animate-pulse shadow-glow-green" />
                                </div>
                            </div>
                            <div className="absolute inset-0 bg-gradient-to-br from-green-500/5 to-emerald-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                        </div>

                        <div className="group backdrop-blur-xl bg-white/70 border border-white/40 rounded-2xl p-6 shadow-xl hover:shadow-2xl transition-all duration-300 hover:-translate-y-1 overflow-hidden relative">
                            <div className="relative z-10 flex items-center justify-between">
                                <div>
                                    <p className="text-sm text-gray-600 font-medium mb-1">Thông báo mới</p>
                                    <p className="text-3xl font-bold text-blue-600">{unreadCount}</p>
                                </div>
                                <div className="w-14 h-14 rounded-full bg-gradient-to-br from-blue-100 to-indigo-100 flex items-center justify-center shadow-lg">
                                    <FiBell className="text-blue-500 group-hover:scale-110 transition-transform" size={28} />
                                </div>
                            </div>
                            <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-indigo-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                        </div>

                        <div className="group backdrop-blur-xl bg-white/70 border border-white/40 rounded-2xl p-6 shadow-xl hover:shadow-2xl transition-all duration-300 hover:-translate-y-1 overflow-hidden relative">
                            <div className="relative z-10 flex items-center justify-between">
                                <div>
                                    <p className="text-sm text-gray-600 font-medium mb-1">Quyền</p>
                                    <p className="text-3xl font-bold text-purple-600 capitalize">{role}</p>
                                </div>
                                <div className="w-14 h-14 rounded-full bg-gradient-to-br from-purple-100 to-pink-100 flex items-center justify-center shadow-lg">
                                    <FiUsers className="text-purple-500 group-hover:scale-110 transition-transform" size={28} />
                                </div>
                            </div>
                            <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 to-pink-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                        </div>
                    </div>
                </div>
            </div>
        </Layout >
    );
}
