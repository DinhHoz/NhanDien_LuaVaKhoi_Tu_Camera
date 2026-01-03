import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "./contexts/AuthContext";
import { NotificationProvider } from "./contexts/NotificationContext";

import ProtectedRoute from "./components/ProtectedRoute";
import PublicRoute from "./components/PublicRoute";
import AdminRoute from "./components/AdminRoute";

import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Cameras from "./pages/Cameras";
import NotificationsPage from "./pages/NotificationsPage";
import AlertsPage from "./pages/AlertsPage";
import AdminUsers from "./pages/admin/AdminUsers";
import AdminCameras from "./pages/admin/AdminCameras";

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <NotificationProvider>
          <Routes>
            {/* 👥 Public: chỉ vào được nếu chưa đăng nhập */}
            <Route
              path="/login"
              element={
                <PublicRoute>
                  <Login />
                </PublicRoute>
              }
            />

            {/* 🔒 Private: chỉ vào khi đã đăng nhập */}
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute>
                  <Dashboard />
                </ProtectedRoute>
              }
            />

            <Route
              path="/cameras"
              element={
                <ProtectedRoute>
                  <Cameras />
                </ProtectedRoute>
              }
            />

            <Route
              path="/notifications"
              element={
                <ProtectedRoute>
                  <NotificationsPage />
                </ProtectedRoute>
              }
            />

            <Route
              path="/alert"
              element={
                <ProtectedRoute>
                  <AlertsPage />
                </ProtectedRoute>
              }
            />

            {/* 🛡 Admin: chỉ admin mới được vào */}
            <Route
              path="/admin/users"
              element={
                <AdminRoute>
                  <AdminUsers />
                </AdminRoute>
              }
            />

            <Route
              path="/admin/cameras"
              element={
                <AdminRoute>
                  <AdminCameras />
                </AdminRoute>
              }
            />

            {/* 🚀 Nếu chưa login → /login, nếu login → /dashboard */}
            <Route
              path="/"
              element={
                <ProtectedRoute>
                  <Navigate to="/dashboard" replace />
                </ProtectedRoute>
              }
            />

            {/* ❌ 404 fallback */}
            <Route path="*" element={<Navigate to="/login" replace />} />
          </Routes>
        </NotificationProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
