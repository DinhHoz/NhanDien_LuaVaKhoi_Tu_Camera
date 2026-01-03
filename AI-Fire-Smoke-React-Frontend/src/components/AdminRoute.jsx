import { Navigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";

export default function AdminRoute({ children }) {
    const { currentUser, role, loading } = useAuth();

    if (loading) return <div>Đang kiểm tra quyền truy cập...</div>;
    if (!currentUser) return <Navigate to="/login" replace />;
    if (role !== "admin") return <Navigate to="/dashboard" replace />;

    return children;
}
