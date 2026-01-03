import { useState, useEffect } from "react";
import Layout from "../components/Layout";
import { useAuth } from "../contexts/AuthContext";

export default function Cameras() {
  const { currentUser } = useAuth();
  const [cameraList, setCameraList] = useState([]);
  const [selectedCount, setSelectedCount] = useState(1);
  const [selectedCameras, setSelectedCameras] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!currentUser) return;

    const fetchCameras = async () => {
      try {
        setLoading(true);
        const token = await currentUser.getIdToken(true);

        const res = await fetch(`${import.meta.env.VITE_API_URL}/api/cameras`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (!res.ok) throw new Error("Không thể tải danh sách camera");

        const data = await res.json();
        setCameraList(data);

        if (data.length > 0) setSelectedCameras([data[0]]);
      } catch (err) {
        console.error("Lỗi tải camera:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchCameras();
  }, [currentUser]);

  const handleSelectLayout = (count) => {
    setSelectedCount(count);

    // Nếu không có camera nào, để trống
    if (cameraList.length === 0) {
      setSelectedCameras([]);
      return;
    }

    // Chỉ lấy tối đa số camera có sẵn, KHÔNG lặp lại
    const availableCount = Math.min(count, cameraList.length);
    setSelectedCameras(cameraList.slice(0, availableCount));
  };

  const handleSelectCamera = (cam) => {
    if (selectedCameras.find((c) => c.id === cam.id)) return;

    const newList = [...selectedCameras];
    if (newList.length >= selectedCount) newList.shift();
    newList.push(cam);
    setSelectedCameras(newList);
  };

  if (loading)
    return (
      <Layout>
        <div className="flex justify-center items-center h-[70vh] text-gray-500">
          Đang tải danh sách camera...
        </div>
      </Layout>
    );

  return (
    <Layout>
      <div className="flex h-[85vh] gap-6">

        {/* MAIN VIEW */}
        <div className="flex-1 backdrop-blur-xl bg-white/40 border border-white/60 rounded-3xl p-6 shadow-2xl flex flex-col">

          <div className="flex justify-end gap-3 mb-4">
            {[1, 4, 9].map((n) => (
              <button
                key={n}
                onClick={() => handleSelectLayout(n)}
                className={`group px-5 py-2.5 rounded-xl font-semibold transition-all duration-300 shadow-md hover:shadow-lg ${selectedCount === n
                  ? "bg-gradient-to-r from-blue-500 to-indigo-600 text-white shadow-blue-500/30 scale-105"
                  : "backdrop-blur-md bg-white/80 border border-white/80 text-gray-700 hover:bg-white hover:border-blue-200"
                  }`}
              >
                <span className="text-lg">{n === 1 ? "1️⃣" : n === 4 ? "2️⃣×2️⃣" : "3️⃣×3️⃣"}</span>
              </button>
            ))}
          </div>

          <div
            className={`grid gap-4 flex-1 ${selectedCount === 1
              ? "grid-cols-1"
              : selectedCount === 4
                ? "grid-cols-2"
                : "grid-cols-3"
              }`}
          >
            {selectedCameras.length === 0 ? (
              <div className="flex flex-col items-center justify-center text-gray-400">
                <svg className="w-20 h-20 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
                <p className="text-lg font-medium">Chưa chọn camera nào</p>
              </div>
            ) : (
              selectedCameras.map((cam, index) => (
                <CameraView key={cam.id} cam={cam} position={index + 1} />
              ))
            )}
          </div>
        </div>

        {/* SIDE LIST */}
        <aside className="w-72 backdrop-blur-xl bg-white/70 border border-white/60 shadow-2xl rounded-3xl p-6 overflow-y-auto">
          <h2 className="text-xl font-bold mb-4 bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent flex items-center gap-2">
            📷 Danh sách Camera
          </h2>

          {cameraList.length === 0 ? (
            <p className="text-gray-500 text-sm text-center py-8">Chưa có camera nào.</p>
          ) : (
            <ul className="space-y-3">
              {cameraList.map((cam) => (
                <li
                  key={cam.id}
                  onClick={() => handleSelectCamera(cam)}
                  className={`cursor-pointer backdrop-blur-md rounded-xl p-4 transition-all duration-300 shadow-md hover:shadow-xl hover:-translate-y-1 ${selectedCameras.find((c) => c.id === cam.id)
                    ? "bg-gradient-to-r from-blue-500 to-indigo-600 text-white border-2 border-blue-300 shadow-blue-500/30 scale-[1.02]"
                    : "bg-white/90 border border-gray-200 hover:bg-white hover:border-blue-200"
                    }`}
                >
                  <div
                    className={`font-semibold ${selectedCameras.find((c) => c.id === cam.id)
                      ? "text-white"
                      : "text-gray-800"
                      }`}
                  >
                    {cam.cameraName}
                  </div>
                  <div
                    className={`text-sm mt-1 ${selectedCameras.find((c) => c.id === cam.id)
                      ? "text-blue-100"
                      : "text-gray-600"
                      }`}
                  >
                    📍 {cam.location}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </aside>
      </div>
    </Layout>
  );
}

/* ==============================
   CAMERA VIEW (MJPEG STREAM)
============================== */

function CameraView({ cam, position }) {
  const { currentUser } = useAuth();
  const [streamUrl, setStreamUrl] = useState("");

  useEffect(() => {
    let active = true;

    const loadUrl = async () => {
      try {
        const token = await currentUser.getIdToken(true);

        // Thêm position và timestamp để tạo URL unique cho mỗi instance
        const url = `${import.meta.env.VITE_API_URL}/api/stream/${cam.id}?token=${token}&position=${position}&t=${Date.now()}`;

        if (active) setStreamUrl(url);
      } catch (err) {
        console.error("Lỗi load token:", err);
      }
    };

    loadUrl();

    return () => {
      active = false;
    };
  }, [cam.id, currentUser, position]);

  return (
    <div className="relative bg-black rounded-lg overflow-hidden shadow-lg" style={{ aspectRatio: '16/9' }}>
      {streamUrl ? (
        <img
          src={streamUrl}
          className="w-full h-full object-contain"
          alt="camera-stream"
          style={{ imageRendering: 'auto' }}
        />
      ) : (
        <div className="flex justify-center items-center h-full text-white">
          Đang tải stream...
        </div>
      )}

      <div className="absolute top-2 left-2 bg-blue-600/90 text-white text-xs px-2 py-1 rounded-md font-bold">
        #{position}
      </div>

      <div className="absolute bottom-0 left-0 right-0 bg-black/50 text-white text-xs p-2 text-center">
        <div className="font-semibold">{cam.cameraName}</div>
        <div>{cam.location}</div>
      </div>
    </div>
  );
}
