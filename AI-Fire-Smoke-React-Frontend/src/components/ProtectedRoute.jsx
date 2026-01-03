import { Navigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";

export default function ProtectedRoute({ children }) {
    const { currentUser, loading } = useAuth();

    if (loading) {
        return (
            <div className="flex justify-center items-center h-screen text-gray-600">
                Đang xác thực người dùng...
            </div>
        );
    }

    // ❌ Nếu chưa đăng nhập → quay lại /login
    if (!currentUser) {
        console.warn("⚠️ Người dùng chưa đăng nhập → chuyển hướng /login");
        return <Navigate to="/login" replace />;
    }

    // ✅ Nếu đã đăng nhập → cho truy cập
    return children;
}
