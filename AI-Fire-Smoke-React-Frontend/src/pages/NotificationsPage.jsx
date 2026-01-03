import { useEffect, useState } from "react";
import {
    FiBell,
    FiTrash2,
    FiCheckCircle,
    FiAlertCircle,
    FiChevronRight,
} from "react-icons/fi";
import {
    collection,
    query,
    orderBy,
    onSnapshot,
    doc,
    updateDoc,
    deleteDoc,
} from "firebase/firestore";
import { getAuth } from "firebase/auth";
import { db } from "../firebase";
import Layout from "../components/Layout";

export default function NotificationsPage() {
    const [notifications, setNotifications] = useState([]);
    const [filter, setFilter] = useState("all"); // all | unread
    const [selectedNotification, setSelectedNotification] = useState(null);

    useEffect(() => {
        const auth = getAuth();
        const unsub = auth.onAuthStateChanged((user) => {
            if (!user) return;

            const alertsRef = collection(db, "users", user.uid, "alerts");
            const q = query(alertsRef, orderBy("timestamp", "desc"));

            const unsubscribe = onSnapshot(q, (snapshot) => {
                const list = snapshot.docs.map((docSnap) => {
                    const data = docSnap.data();
                    const timestamp =
                        (data.timestamp?._seconds ?? data.timestamp?.seconds) * 1000;

                    return {
                        id: docSnap.id,
                        title:
                            data.type === "fire"
                                ? `Phát hiện cháy tại ${data.cameraName || "camera"}`
                                : data.type === "smoke"
                                    ? `Phát hiện khói tại ${data.cameraName || "camera"}`
                                    : `Cảnh báo khác`,
                        time: timestamp
                            ? new Date(timestamp).toLocaleString("vi-VN")
                            : "Không xác định",
                        timestamp: timestamp,
                        type: data.type,
                        location: data.location || "Không xác định",
                        cameraName: data.cameraName || "Camera",
                        imageUrl: data.imageUrl || null,
                        read: data.read ?? false,
                    };
                });

                // Filter to show only today's notifications
                const today = new Date();
                today.setHours(0, 0, 0, 0);
                const todayTimestamp = today.getTime();

                const todayNotifications = list.filter((n) => n.timestamp >= todayTimestamp);

                setNotifications(todayNotifications);
            });

            return () => unsubscribe();
        });

        return () => unsub();
    }, []);

    // Mark as read
    const markAsRead = async (id) => {
        const auth = getAuth();
        const user = auth.currentUser;
        if (!user) return;

        try {
            const ref = doc(db, "users", user.uid, "alerts", id);
            await updateDoc(ref, { read: true });
            setNotifications((prev) =>
                prev.map((n) => (n.id === id ? { ...n, read: true } : n))
            );
        } catch (err) {
            console.error("🔥 Lỗi cập nhật trạng thái đọc:", err);
        }
    };

    // Mark all as read
    const markAllAsRead = async () => {
        const auth = getAuth();
        const user = auth.currentUser;
        if (!user) return;

        try {
            const unread = notifications.filter((n) => !n.read);
            await Promise.all(
                unread.map((n) =>
                    updateDoc(doc(db, "users", user.uid, "alerts", n.id), {
                        read: true,
                    })
                )
            );
            setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
        } catch (err) {
            console.error("🔥 Lỗi đánh dấu tất cả đã đọc:", err);
        }
    };

    // Delete notification
    const deleteNotification = async (id) => {
        const auth = getAuth();
        const user = auth.currentUser;
        if (!user) return;

        try {
            await deleteDoc(doc(db, "users", user.uid, "alerts", id));
            setNotifications((prev) => prev.filter((n) => n.id !== id));
        } catch (err) {
            console.error("🔥 Lỗi khi xóa thông báo:", err);
        }
    };

    // Filter only recent notifications (last 24 hours for unread filter)
    const filteredNotifications = notifications.filter((n) => {
        if (filter === "unread") return !n.read;
        return true;
    });

    const unreadCount = notifications.filter((n) => !n.read).length;

    // Detail View
    if (selectedNotification) {
        const n = selectedNotification;
        return (
            <Layout>
                <div className="max-w-3xl mx-auto p-6">
                    <button
                        onClick={() => setSelectedNotification(null)}
                        className="mb-6 flex items-center gap-2 px-4 py-2 backdrop-blur-md bg-white/70 border border-white/60 rounded-xl hover:bg-white transition-all shadow-md hover:shadow-lg"
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                        </svg>
                        <span className="font-medium">Quay lại</span>
                    </button>

                    <div className="backdrop-blur-xl bg-white/80 border border-white/60 rounded-3xl shadow-2xl overflow-hidden">
                        {/* Header */}
                        <div className={`p-6 ${n.type === "fire"
                            ? "bg-gradient-to-r from-red-500 to-orange-500"
                            : "bg-gradient-to-r from-gray-500 to-gray-600"
                            }`}>
                            <div className="flex items-center gap-3 text-white">
                                <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center backdrop-blur-sm">
                                    <FiAlertCircle size={32} />
                                </div>
                                <div>
                                    <h2 className="text-2xl font-bold">{n.title}</h2>
                                    <p className="text-sm opacity-90">{n.time}</p>
                                </div>
                            </div>
                        </div>

                        {/* Image */}
                        {n.imageUrl && (
                            <div className="relative">
                                <img
                                    src={n.imageUrl}
                                    alt="alert"
                                    className="w-full h-96 object-cover"
                                />
                            </div>
                        )}

                        {/* Details */}
                        <div className="p-8 space-y-4">
                            <div className="flex items-center gap-3">
                                <svg className="w-6 h-6 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                                </svg>
                                <div>
                                    <div className="text-sm text-gray-500">Vị trí</div>
                                    <div className="font-semibold text-gray-800">{n.location}</div>
                                </div>
                            </div>

                            <div className="flex items-center gap-3">
                                <svg className="w-6 h-6 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                </svg>
                                <div>
                                    <div className="text-sm text-gray-500">Camera</div>
                                    <div className="font-semibold text-gray-800">{n.cameraName}</div>
                                </div>
                            </div>
                        </div>

                        {/* Footer */}
                        <div className="px-8 py-6 bg-gray-50 border-t flex justify-between">
                            <button
                                onClick={() => setSelectedNotification(null)}
                                className="px-6 py-3 bg-white border-2 border-gray-300 rounded-xl font-semibold hover:bg-gray-50 transition"
                            >
                                Đóng
                            </button>
                            {!n.read && (
                                <button
                                    onClick={() => {
                                        markAsRead(n.id);
                                        setSelectedNotification(null);
                                    }}
                                    className="px-6 py-3 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-xl font-semibold hover:shadow-xl transition"
                                >
                                    Đánh dấu đã đọc
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            </Layout>
        );
    }

    // List View
    return (
        <Layout>
            <div className="max-w-4xl mx-auto p-6">
                {/* Header */}
                <div className="mb-8 text-center">
                    <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 bg-clip-text text-transparent mb-3 flex items-center justify-center gap-3">
                        <FiBell size={40} className="text-blue-600" />
                        Thông báo
                    </h1>
                    <p className="text-gray-600 text-lg">
                        Các cảnh báo mới trong ngày hôm nay
                    </p>
                </div>

                {/* Stats & Actions Bar */}
                <div className="backdrop-blur-xl bg-white/70 border border-white/60 rounded-2xl shadow-xl p-6 mb-6">
                    <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                        <div className="flex items-center gap-6">
                            <div>
                                <div className="text-sm text-gray-600">Hôm nay</div>
                                <div className="text-2xl font-bold text-gray-800">{notifications.length}</div>
                            </div>
                            <div className="h-12 w-px bg-gray-300"></div>
                            <div>
                                <div className="text-sm text-gray-600">Chưa đọc</div>
                                <div className="text-2xl font-bold text-orange-600">{unreadCount}</div>
                            </div>
                        </div>

                        {unreadCount > 0 && (
                            <button
                                onClick={markAllAsRead}
                                className="px-6 py-3 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-xl font-semibold hover:shadow-xl transition-all flex items-center gap-2"
                            >
                                <FiCheckCircle size={20} />
                                Đánh dấu tất cả đã đọc
                            </button>
                        )}
                    </div>
                </div>

                {/* Filter Tabs */}
                <div className="flex gap-2 mb-6">
                    {[
                        { label: "Tất cả", value: "all", count: notifications.length },
                        { label: "Chưa đọc", value: "unread", count: unreadCount },
                    ].map((tab) => (
                        <button
                            key={tab.value}
                            onClick={() => setFilter(tab.value)}
                            className={`px-6 py-3 rounded-xl font-medium transition-all ${filter === tab.value
                                ? "bg-gradient-to-r from-blue-500 to-indigo-600 text-white shadow-lg"
                                : "backdrop-blur-md bg-white/70 border border-white/60 text-gray-700 hover:bg-white"
                                }`}
                        >
                            {tab.label} ({tab.count})
                        </button>
                    ))}
                </div>

                {/* Notifications Timeline */}
                {filteredNotifications.length === 0 ? (
                    <div className="backdrop-blur-xl bg-white/70 border border-white/60 rounded-2xl shadow-xl p-12 text-center">
                        <div className="w-20 h-20 bg-gradient-to-br from-gray-100 to-gray-200 rounded-full flex items-center justify-center mx-auto mb-4">
                            <FiBell size={40} className="text-gray-400" />
                        </div>
                        <h3 className="text-xl font-bold text-gray-800 mb-2">
                            Không có thông báo
                        </h3>
                        <p className="text-gray-500">
                            {filter === "unread" ? "Bạn đã đọc hết thông báo" : "Chưa có thông báo nào"}
                        </p>
                    </div>
                ) : (
                    <>
                        <div className="space-y-3">
                            {/* Show only first 10 notifications */}
                            {filteredNotifications.slice(0, 10).map((n) => (
                                <div
                                    key={n.id}
                                    className={`group cursor-pointer backdrop-blur-xl border rounded-2xl p-5 transition-all hover:shadow-2xl hover:-translate-y-1 ${n.read
                                        ? "bg-white/60 border-gray-200"
                                        : "bg-white/90 border-blue-300 shadow-lg"
                                        }`}
                                >
                                    <div className="flex items-center justify-between">
                                        <div
                                            className="flex items-center gap-4 flex-1"
                                            onClick={() => {
                                                if (!n.read) markAsRead(n.id);
                                                setSelectedNotification(n);
                                            }}
                                        >
                                            {/* Icon */}
                                            <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${n.type === "fire"
                                                ? "bg-gradient-to-br from-red-500 to-orange-500"
                                                : "bg-gradient-to-br from-gray-500 to-gray-600"
                                                }`}>
                                                <FiAlertCircle className="text-white" size={24} />
                                            </div>

                                            {/* Content */}
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2 mb-1">
                                                    <p className={`font-semibold ${n.read ? "text-gray-700" : "text-gray-900"}`}>
                                                        {n.title}
                                                    </p>
                                                    {!n.read && (
                                                        <span className="px-2 py-0.5 bg-blue-500 text-white text-xs rounded-full">
                                                            Mới
                                                        </span>
                                                    )}
                                                </div>
                                                <div className="flex items-center gap-3 text-sm text-gray-600">
                                                    <span>📍 {n.location}</span>
                                                    <span>•</span>
                                                    <span>⏰ {n.time}</span>
                                                </div>
                                            </div>

                                            {/* Arrow */}
                                            <FiChevronRight className="text-gray-400 group-hover:text-blue-600 transition" size={20} />
                                        </div>

                                        {/* Actions */}
                                        <div className="flex items-center gap-2 ml-4">
                                            {!n.read && (
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        markAsRead(n.id);
                                                    }}
                                                    className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition"
                                                    title="Đánh dấu đã đọc"
                                                >
                                                    <FiCheckCircle size={20} />
                                                </button>
                                            )}
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    if (confirm("Xóa thông báo này?")) {
                                                        deleteNotification(n.id);
                                                    }
                                                }}
                                                className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition"
                                                title="Xóa"
                                            >
                                                <FiTrash2 size={20} />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* View Full History Button - At Bottom */}
                        <div className="mt-6 backdrop-blur-xl bg-white/70 border border-white/60 rounded-2xl shadow-xl p-6 text-center">
                            <a
                                href="/alert"
                                className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-orange-500 to-red-500 text-white rounded-xl font-semibold hover:shadow-xl transition-all"
                            >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                                </svg>
                                Xem lịch sử đầy đủ
                            </a>
                            <p className="text-xs text-gray-500 mt-2">
                                {filteredNotifications.length > 10
                                    ? `Còn ${filteredNotifications.length - 10} thông báo khác`
                                    : "Xem tất cả lịch sử cảnh báo"
                                }
                            </p>
                        </div>
                    </>
                )}
            </div>
        </Layout>
    );
}
