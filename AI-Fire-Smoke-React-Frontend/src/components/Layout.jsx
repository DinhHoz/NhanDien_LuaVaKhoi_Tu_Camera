import { useEffect, useRef, useState } from "react";
import Navbar from "./Navbar";
import { useAuth } from "../contexts/AuthContext";
import toast, { Toaster } from "react-hot-toast";
import { useNotifications } from "../contexts/NotificationContext";
import ToastLayout from "./ToastLayout";

export default function Layout({ children }) {
    const { currentUser } = useAuth();
    const { setUnreadCount } = useNotifications();

    const wsRef = useRef(null);
    const [flashColor, setFlashColor] = useState(null);
    const [isFlashing, setIsFlashing] = useState(false);
    const audioRef = useRef(new Audio("/alert/alert-sound.mp3"));

    useEffect(() => {
        // Pre-load audio
        audioRef.current.load();
        audioRef.current.volume = 1.0;
    }, []);

    const startFlash = (color) => {
        setFlashColor(color);
        setIsFlashing(true);
    };

    const stopFlash = () => {
        setFlashColor(null);
        setIsFlashing(false);
    };

    useEffect(() => {
        if (!currentUser) return;

        let active = true;

        const connectWS = async () => {
            const token = await currentUser.getIdToken();

            const wsUrl = `${import.meta.env.VITE_API_URL.replace(
                "http",
                "ws"
            )}/api/alerts/live?token=${token}`;

            console.log("Connecting WS:", wsUrl);

            const ws = new WebSocket(wsUrl);
            wsRef.current = ws;

            ws.onopen = () => console.log("WS connected");

            ws.onerror = (err) => console.error("WS error:", err);

            ws.onclose = () => {
                if (!active) return;
                setTimeout(connectWS, 3000);
            };

            ws.onmessage = (msg) => {
                try {
                    const data = JSON.parse(msg.data);

                    const type = (data.type || "").toLowerCase();
                    const cameraName = data.cameraName || "camera";

                    const title =
                        type === "fire"
                            ? `🔥 Phát hiện cháy tại ${cameraName}`
                            : type === "smoke"
                                ? `💨 Phát hiện khói tại ${cameraName}`
                                : `⚠️ Cảnh báo mới`;

                    setUnreadCount((prev) => prev + 1);

                    toast(title, {
                        duration: 6000,
                        icon: type === "fire" ? "🔥" : "💨",
                        style: {
                            borderRadius: "12px",
                            background: "#fff",
                            color: "#333",
                            border: "2px solid red",
                            fontWeight: "bold"
                        },
                    });

                    // Bắt đầu nháy màn hình ngay lập tức
                    startFlash(type === "fire" ? "red" : "yellow");

                    // Tự động dừng nháy sau 5 giây nếu không có âm thanh kết thúc
                    const flashTimeout = setTimeout(stopFlash, 5000);

                    // Xử lý âm thanh
                    try {
                        audioRef.current.currentTime = 0;
                        audioRef.current.play()
                            .then(() => {
                                // Nếu âm thanh chạy được, xóa timeout và đợi âm thanh kết thúc mới dừng nháy
                                clearTimeout(flashTimeout);
                                audioRef.current.onended = () => stopFlash();
                            })
                            .catch(() => {
                                // Nếu bị chặn, flashTimeout vẫn sẽ chạy để dừng nháy sau 5s
                            });
                    } catch {
                        // Lỗi tạo Audio hoặc play
                    }
                } catch (e) {
                    // Lỗi parse JSON
                }
            };
        };

        connectWS();

        return () => {
            active = false;
            wsRef.current?.close();
        };
    }, [currentUser, setUnreadCount]);

    return (
        <div className="relative min-h-screen flex flex-col bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 overflow-hidden">
            {/* Background Image - Applied globally */}
            <div
                className="fixed inset-0 z-0 opacity-30"
                style={{
                    backgroundImage: 'url(/dashboard-bg.png)',
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                    backgroundAttachment: 'fixed'
                }}
            />

            {isFlashing && (
                <div
                    className="fixed inset-0 z-50 pointer-events-none"
                    style={{
                        backgroundColor:
                            flashColor === "red"
                                ? "rgba(255, 0, 0, 0.4)"
                                : "rgba(255, 230, 0, 0.5)",
                        animation: "flashLoop 0.5s ease-in-out infinite",
                    }}
                />
            )}

            <ToastLayout />
            <Toaster position="top-right" />
            <Navbar />

            <main className="flex-1 container mx-auto px-6 py-10 z-10 relative">
                {children}
            </main>

            {/* Footer */}
            <footer className="bg-white/80 backdrop-blur-md border-t border-gray-200 py-6 mt-auto z-10 relative">
                <div className="container mx-auto px-6 text-center">
                    <p className="text-gray-600 text-sm font-medium">
                        © 2025 RabbitFire System.
                    </p>

                </div>
            </footer>

            <style>{`
                @keyframes flashLoop {
                    0%, 100% { opacity: 0; }
                    25%, 75% { opacity: 1; }
                }
            `}</style>
        </div>
    );
}
