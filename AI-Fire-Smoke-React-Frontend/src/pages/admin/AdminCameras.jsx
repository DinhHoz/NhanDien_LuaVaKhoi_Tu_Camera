import { useState, useEffect } from "react";
import Layout from "../../components/Layout";
import { useAuth } from "../../contexts/AuthContext";
import toast from "react-hot-toast";
import { FiVideo, FiPlus, FiEdit2, FiTrash2, FiSearch } from "react-icons/fi";

export default function AdminCameras() {
    const { currentUser } = useAuth();
    const [cameras, setCameras] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const [filterStatus, setFilterStatus] = useState("all");

    // Modal states
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [modalMode, setModalMode] = useState("add"); // "add" or "edit"
    const [editingCamera, setEditingCamera] = useState(null);

    // Form states
    const [formData, setFormData] = useState({
        cameraName: "",
        streamUrl: "",
        location: "",
        status: "active",
    });

    // Fetch cameras
    const fetchCameras = async () => {
        try {
            setLoading(true);
            const token = await currentUser.getIdToken(true);

            const res = await fetch(`${import.meta.env.VITE_API_URL}/api/cameras`, {
                headers: { Authorization: `Bearer ${token}` },
            });

            if (!res.ok) throw new Error("Không thể tải danh sách camera");

            const data = await res.json();
            setCameras(data);
        } catch (err) {
            console.error("Lỗi tải camera:", err);
            toast.error("Không thể tải danh sách camera");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (currentUser) fetchCameras();
    }, [currentUser]);

    // Open modal for adding
    const handleAdd = () => {
        setModalMode("add");
        setFormData({
            cameraName: "",
            streamUrl: "",
            location: "",
            status: "active",
        });
        setEditingCamera(null);
        setIsModalOpen(true);
    };

    // Open modal for editing
    const handleEdit = (camera) => {
        setModalMode("edit");
        setFormData({
            cameraName: camera.cameraName,
            streamUrl: camera.streamUrl,
            location: camera.location,
            status: camera.status,
        });
        setEditingCamera(camera);
        setIsModalOpen(true);
    };

    // Save (add or edit)
    const handleSave = async () => {
        const { cameraName, streamUrl, location, status } = formData;

        if (!cameraName || !streamUrl || !location) {
            toast.error("Vui lòng điền đầy đủ thông tin");
            return;
        }

        try {
            const token = await currentUser.getIdToken(true);

            let res;
            if (modalMode === "add") {
                res = await fetch(`${import.meta.env.VITE_API_URL}/api/cameras`, {
                    method: "POST",
                    headers: {
                        Authorization: `Bearer ${token}`,
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({ cameraName, streamUrl, location, status }),
                });
            } else {
                res = await fetch(
                    `${import.meta.env.VITE_API_URL}/api/cameras/${editingCamera.id}`,
                    {
                        method: "PUT",
                        headers: {
                            Authorization: `Bearer ${token}`,
                            "Content-Type": "application/json",
                        },
                        body: JSON.stringify({ cameraName, streamUrl, location, status }),
                    }
                );
            }

            if (!res.ok) throw new Error("Lỗi khi lưu camera");

            toast.success(
                modalMode === "add" ? "Thêm camera thành công" : "Cập nhật camera thành công"
            );

            setIsModalOpen(false);
            fetchCameras();
        } catch (err) {
            console.error("Lỗi lưu camera:", err);
            toast.error("Không thể lưu camera");
        }
    };

    // Delete camera
    const handleDelete = async (cameraId, cameraName) => {
        if (!confirm(`Bạn có chắc muốn xóa camera "${cameraName}"?`)) return;

        try {
            const token = await currentUser.getIdToken(true);

            const res = await fetch(
                `${import.meta.env.VITE_API_URL}/api/cameras/${cameraId}`,
                {
                    method: "DELETE",
                    headers: { Authorization: `Bearer ${token}` },
                }
            );

            if (!res.ok) throw new Error("Lỗi khi xóa camera");

            toast.success("Xóa camera thành công");
            fetchCameras();
        } catch (err) {
            console.error("Lỗi xóa camera:", err);
            toast.error("Không thể xóa camera");
        }
    };

    // Filter cameras
    const filteredCameras = cameras.filter((cam) => {
        const matchSearch =
            cam.cameraName.toLowerCase().includes(searchTerm.toLowerCase()) ||
            cam.location.toLowerCase().includes(searchTerm.toLowerCase());

        const matchStatus = filterStatus === "all" || cam.status === filterStatus;

        return matchSearch && matchStatus;
    });

    return (
        <Layout>
            <div className="max-w-7xl mx-auto">
                {/* Header */}
                <div className="mb-8 text-center">
                    <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 bg-clip-text text-transparent mb-3 flex items-center justify-center gap-3">
                        <FiVideo size={40} className="text-blue-600" />
                        Quản lý Camera
                    </h1>
                    <p className="text-gray-600 text-lg">
                        Quản lý camera giám sát của hệ thống
                    </p>
                </div>

                {/* Toolbar */}
                <div className="backdrop-blur-xl bg-white/70 border border-white/60 rounded-2xl shadow-xl p-6 mb-6">
                    <div className="flex flex-col md:flex-row gap-4 justify-between items-center">
                        {/* Search */}
                        <div className="relative flex-1 w-full md:w-auto">
                            <input
                                type="text"
                                placeholder="Tìm kiếm camera..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full px-4 py-3 pl-10 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white/80 backdrop-blur-sm"
                            />
                            <span className="absolute left-3 top-3.5 text-gray-400">
                                🔍
                            </span>
                        </div>

                        {/* Filter */}
                        <select
                            value={filterStatus}
                            onChange={(e) => setFilterStatus(e.target.value)}
                            className="px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white/80 backdrop-blur-sm"
                        >
                            <option value="all">Tất cả trạng thái</option>
                            <option value="active">Hoạt động</option>
                            <option value="inactive">Không hoạt động</option>
                        </select>

                        {/* Add button */}
                        <button
                            onClick={handleAdd}
                            className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-500 via-indigo-600 to-purple-600 text-white rounded-xl font-semibold hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1 hover:scale-105"
                        >
                            <FiPlus size={20} />
                            Thêm Camera
                        </button>
                    </div>
                </div>

                {/* Table */}
                <div className="backdrop-blur-xl bg-white/70 border border-white/60 rounded-2xl shadow-xl overflow-hidden">
                    {loading ? (
                        <div className="flex justify-center items-center h-64 text-gray-500">
                            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
                        </div>
                    ) : filteredCameras.length === 0 ? (
                        <div className="flex flex-col justify-center items-center h-64 text-gray-400">
                            <svg
                                className="w-16 h-16 mb-4"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                            >
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
                                />
                            </svg>
                            <p className="text-lg">Không tìm thấy camera nào</p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-gradient-to-r from-indigo-50 to-blue-50">
                                    <tr>
                                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                                            Tên Camera
                                        </th>
                                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                                            Vị trí
                                        </th>
                                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                                            URL Stream
                                        </th>
                                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                                            Trạng thái
                                        </th>
                                        <th className="px-6 py-4 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider">
                                            Hành động
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                    {filteredCameras.map((cam, idx) => (
                                        <tr
                                            key={cam.id}
                                            className="hover:bg-gray-50 transition-colors"
                                        >
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="flex items-center">
                                                    <div className="flex-shrink-0 h-10 w-10 bg-gradient-to-br from-blue-400 to-indigo-500 rounded-lg flex items-center justify-center text-white font-bold">
                                                        {idx + 1}
                                                    </div>
                                                    <div className="ml-4">
                                                        <div className="text-sm font-medium text-gray-900">
                                                            {cam.cameraName}
                                                        </div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="text-sm text-gray-700">
                                                    📍 {cam.location}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="text-sm text-gray-500 max-w-xs truncate">
                                                    {cam.streamUrl}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <span
                                                    className={`px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${cam.status === "active"
                                                        ? "bg-green-100 text-green-800"
                                                        : "bg-red-100 text-red-800"
                                                        }`}
                                                >
                                                    {cam.status === "active"
                                                        ? "🟢 Hoạt động"
                                                        : "🔴 Không hoạt động"}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                                <div className="flex items-center justify-end gap-2">
                                                    <button
                                                        onClick={() => handleEdit(cam)}
                                                        className="p-2 bg-indigo-500 text-white rounded-lg hover:bg-indigo-600 transition-all shadow-md hover:shadow-lg"
                                                        title="Sửa"
                                                    >
                                                        <FiEdit2 size={16} />
                                                    </button>
                                                    <button
                                                        onClick={() =>
                                                            handleDelete(cam.id, cam.cameraName)
                                                        }
                                                        className="p-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-all shadow-md hover:shadow-lg"
                                                        title="Xóa"
                                                    >
                                                        <FiTrash2 size={16} />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>

                {/* Stats */}
                <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="backdrop-blur-xl bg-gradient-to-br from-blue-500/90 to-indigo-600/90 border border-white/40 rounded-2xl p-8 text-white shadow-2xl transform hover:-translate-y-2 transition-all">
                        <div className="flex items-center justify-between mb-3">
                            <div className="text-sm font-semibold opacity-90 uppercase tracking-wide">Tổng số camera</div>
                            <svg className="w-10 h-10 opacity-80" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                            </svg>
                        </div>
                        <div className="text-5xl font-bold">{cameras.length}</div>
                    </div>

                    <div className="backdrop-blur-xl bg-gradient-to-br from-green-500/90 to-emerald-600/90 border border-white/40 rounded-2xl p-8 text-white shadow-2xl transform hover:-translate-y-2 transition-all">
                        <div className="flex items-center justify-between mb-3">
                            <div className="text-sm font-semibold opacity-90 uppercase tracking-wide">Đang hoạt động</div>
                            <div className="relative">
                                <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
                                    <div className="w-4 h-4 rounded-full bg-white animate-pulse"></div>
                                </div>
                            </div>
                        </div>
                        <div className="text-5xl font-bold">
                            {cameras.filter((c) => c.status === "active").length}
                        </div>
                    </div>

                    <div className="backdrop-blur-xl bg-gradient-to-br from-red-500/90 to-pink-600/90 border border-white/40 rounded-2xl p-8 text-white shadow-2xl transform hover:-translate-y-2 transition-all">
                        <div className="flex items-center justify-between mb-3">
                            <div className="text-sm font-semibold opacity-90 uppercase tracking-wide">Không hoạt động</div>
                            <svg className="w-10 h-10 opacity-80" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                            </svg>
                        </div>
                        <div className="text-5xl font-bold">
                            {cameras.filter((c) => c.status === "inactive").length}
                        </div>
                    </div>
                </div>
            </div>

            {/* Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden animate-fadeIn">
                        {/* Modal Header */}
                        <div className="bg-gradient-to-r from-blue-500 to-indigo-600 px-6 py-4">
                            <h2 className="text-xl font-bold text-white">
                                {modalMode === "add" ? "➕ Thêm Camera Mới" : "✏️ Chỉnh sửa Camera"}
                            </h2>
                        </div>

                        {/* Modal Body */}
                        <div className="p-6 space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    📹 Tên Camera
                                </label>
                                <input
                                    type="text"
                                    value={formData.cameraName}
                                    onChange={(e) =>
                                        setFormData({ ...formData, cameraName: e.target.value })
                                    }
                                    placeholder="VD: Camera tầng 1"
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    📍 Vị trí
                                </label>
                                <input
                                    type="text"
                                    value={formData.location}
                                    onChange={(e) =>
                                        setFormData({ ...formData, location: e.target.value })
                                    }
                                    placeholder="VD: Hành lang tầng 1"
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    🔗 URL Stream
                                </label>
                                <input
                                    type="text"
                                    value={formData.streamUrl}
                                    onChange={(e) =>
                                        setFormData({ ...formData, streamUrl: e.target.value })
                                    }
                                    placeholder="rtsp://..."
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    🟢 Trạng thái
                                </label>
                                <select
                                    value={formData.status}
                                    onChange={(e) =>
                                        setFormData({ ...formData, status: e.target.value })
                                    }
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                >
                                    <option value="active">Hoạt động</option>
                                    <option value="inactive">Không hoạt động</option>
                                </select>
                            </div>
                        </div>

                        {/* Modal Footer */}
                        <div className="bg-gray-50 px-6 py-4 flex justify-end gap-3">
                            <button
                                onClick={() => setIsModalOpen(false)}
                                className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-100 transition-colors"
                            >
                                Hủy
                            </button>
                            <button
                                onClick={handleSave}
                                className="px-4 py-2 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-lg font-medium hover:from-blue-600 hover:to-indigo-700 transition-all shadow-md"
                            >
                                {modalMode === "add" ? "Thêm mới" : "Cập nhật"}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </Layout>
    );
}
