import { useState } from "react";
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth } from "../firebase";
import { useNavigate } from "react-router-dom";
import { FiMail, FiLock, FiLogIn } from "react-icons/fi";

export default function Login() {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    const handleLogin = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError("");

        try {
            await signInWithEmailAndPassword(auth, email, password);
            navigate("/dashboard");
        } catch {
            setError("Sai email hoặc mật khẩu. Vui lòng thử lại.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="relative flex items-center justify-center min-h-screen overflow-hidden">
            {/* Background Image */}
            <div
                className="absolute inset-0 z-0"
                style={{
                    backgroundImage: 'url(/login-bg.png)',
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                }}
            />

            {/* Overlay */}
            <div className="absolute inset-0 bg-black/20 z-0" />

            {/* Floating Particles */}
            <div className="absolute inset-0 z-0 overflow-hidden">
                {[...Array(20)].map((_, i) => (
                    <div
                        key={i}
                        className="absolute rounded-full bg-white/10"
                        style={{
                            width: `${Math.random() * 100 + 50}px`,
                            height: `${Math.random() * 100 + 50}px`,
                            left: `${Math.random() * 100}%`,
                            top: `${Math.random() * 100}%`,
                            animation: `float ${Math.random() * 10 + 10}s ease-in-out infinite`,
                            animationDelay: `${Math.random() * 5}s`,
                        }}
                    />
                ))}
            </div>

            {/* Login Card */}
            <div className="relative z-10 backdrop-blur-2xl bg-white/90 border border-white/40 shadow-2xl rounded-3xl p-10 w-full max-w-md animate-fadeIn">
                {/* Logo & Title */}
                <div className="text-center mb-8">
                    <div className="mb-4 flex justify-center">
                        <img
                            src="/rabbit-fire-logo.png"
                            alt="RabbitFire Logo"
                            className="h-24 w-24 object-contain animate-float drop-shadow-2xl"
                        />
                    </div>
                    <h1 className="text-5xl font-bold bg-gradient-to-r from-orange-500 via-red-500 to-pink-500 bg-clip-text text-transparent mb-2 bg-[length:200%_100%] animate-shimmer">
                        RabbitFire
                    </h1>
                    <p className="text-gray-600 font-medium">Hệ thống phát hiện cháy & khói</p>
                </div>

                {/* Error Message */}
                {error && (
                    <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-xl mb-6 text-sm animate-shake">
                        {error}
                    </div>
                )}

                {/* Login Form */}
                <form onSubmit={handleLogin} className="space-y-5">
                    {/* Email Input */}
                    <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                            📧 Email
                        </label>
                        <div className="relative group">
                            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-orange-500 transition-colors">
                                <FiMail size={20} />
                            </div>
                            <input
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="w-full pl-12 pr-4 py-3.5 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all bg-white/80 focus:bg-white focus:shadow-lg"
                                placeholder="your@email.com"
                                required
                            />
                        </div>
                    </div>

                    {/* Password Input */}
                    <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                            🔒 Mật khẩu
                        </label>
                        <div className="relative group">
                            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-orange-500 transition-colors">
                                <FiLock size={20} />
                            </div>
                            <input
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="w-full pl-12 pr-4 py-3.5 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all bg-white/80 focus:bg-white focus:shadow-lg"
                                placeholder="••••••••"
                                required
                            />
                        </div>
                    </div>

                    {/* Login Button */}
                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-gradient-to-r from-orange-500 via-red-500 to-pink-500 text-white font-bold py-3.5 rounded-xl hover:shadow-2xl hover:scale-[1.02] transition-all duration-300 transform disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-lg relative overflow-hidden group"
                    >
                        <div className="absolute inset-0 bg-gradient-to-r from-pink-500 via-red-500 to-orange-500 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                        <div className="relative z-10 flex items-center gap-2">
                            {loading ? (
                                <>
                                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white" />
                                    <span>Đang đăng nhập...</span>
                                </>
                            ) : (
                                <>
                                    <FiLogIn size={20} />
                                    <span>Đăng nhập</span>
                                </>
                            )}
                        </div>
                    </button>
                </form>

                {/* Footer */}
                <p className="text-center text-sm text-gray-500 mt-8">
                    © 2025 RabbitFire — Fire & Smoke Detection
                </p>
            </div>

            {/* CSS Animations */}
            <style>{`
                @keyframes float {
                    0%, 100% { transform: translateY(0) translateX(0); }
                    50% { transform: translateY(-20px) translateX(20px); }
                }
                
                @keyframes shake {
                    0%, 100% { transform: translateX(0); }
                    25% { transform: translateX(-10px); }
                    75% { transform: translateX(10px); }
                }
                
                .animate-shake {
                    animation: shake 0.5s ease-in-out;
                }
            `}</style>
        </div>
    );
}
