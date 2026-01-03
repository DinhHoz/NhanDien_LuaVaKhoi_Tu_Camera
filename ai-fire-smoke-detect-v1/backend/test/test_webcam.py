import cv2
import requests
import io
import time
from datetime import datetime
import os
from concurrent.futures import ThreadPoolExecutor, as_completed
import threading

# ================== CẤU HÌNH ==================
API_URL = "http://localhost:3000/api/detect"
FIELD_NAME = "image"
SAMPLE_RATE = 10                # gửi 1 frame mỗi 10 frame
CAMERA_ID = "CAM_LAPTOP_01"
CAMERA_NAME = "Laptop Camera"
LOCATION = "Phòng Test"
FIREBASE_TOKEN = "Bearer eyJhbGciOiJSUzI1NiIsImtpZCI6ImUzZWU3ZTAyOGUzODg1YTM0NWNlMDcwNTVmODQ2ODYyMjU1YTcwNDYiLCJ0eXAiOiJKV1QifQ.eyJpc3MiOiJodHRwczovL3NlY3VyZXRva2VuLmdvb2dsZS5jb20vYWktZGV0ZWN0LWZpcmUtc21va2UiLCJhdWQiOiJhaS1kZXRlY3QtZmlyZS1zbW9rZSIsImF1dGhfdGltZSI6MTc1ODAwODU3MCwidXNlcl9pZCI6IlhzMDZ0V2hOdlRZbktiS3pvWTNXMXpkYUIyRjIiLCJzdWIiOiJYczA2dFdoTnZUWW5LYkt6b1kzVzF6ZGFCMkYyIiwiaWF0IjoxNzU4MDA4NTcwLCJleHAiOjE3NTgwMTIxNzAsImVtYWlsIjoiYWRtaW5AZ21haWwuY29tIiwiZW1haWxfdmVyaWZpZWQiOmZhbHNlLCJmaXJlYmFzZSI6eyJpZGVudGl0aWVzIjp7ImVtYWlsIjpbImFkbWluQGdtYWlsLmNvbSJdfSwic2lnbl9pbl9wcm92aWRlciI6InBhc3N3b3JkIn19.ttIRnVF0qx4zn6vMuuIS43Cx-aKmusSQJeiDH54Aao5weqxjyj8V-vlyAoUtDf_cYunPb9SvcxpkM-H5t0xejMXNuhkobpwBOkxLIWNEKNiQkxSntGgDLbF8Q2RQZ_V3vrh02OcWw3fZ3V99Vt9ZWYYZsDhZ5o0dFxR9_pG5Nr7vvZ7Sd-6gg-TY6bL552KMMQWJh2A_enAbL5_bXmUp26cluYy88DDRpMixq4ZG143K-bf_BRu6WhHDtOdH9SqppmqnX565R6DmW5rMrBASFgzia8-OkvCpWr8lLachEM6rbTjqDJ3QvUWNmzwtlSQk-vm5idEJJgECTH0J3pyMvw"
SAVE_DIR = r"backend\test\img\test_webcam"

os.makedirs(SAVE_DIR, exist_ok=True)

# Thread pool để gửi request đồng thời
executor = ThreadPoolExecutor(max_workers=4)  # tùy chỉnh theo CPU/GPU

# ================== HÀM HỖ TRỢ ==================
def encode_frame_jpeg(frame) -> bytes:
    """Chuyển frame sang JPEG bytes"""
    ret, buf = cv2.imencode('.jpg', frame, [int(cv2.IMWRITE_JPEG_QUALITY), 90])
    if not ret:
        raise RuntimeError("Không encode được frame sang JPEG")
    return buf.tobytes()

def send_frame(jpeg_bytes: bytes, frame_idx: int, frame) -> dict:
    """Gửi frame lên API trong thread riêng và log chi tiết"""
    thread_name = threading.current_thread().name
    timestamp_start = datetime.now().strftime("%H:%M:%S.%f")
    print(f"[{timestamp_start}] [Frame {frame_idx}] Bắt đầu gửi ở {thread_name}")

    files = {FIELD_NAME: ("frame.jpg", io.BytesIO(jpeg_bytes), "image/jpeg")}
    data = {
        "cameraId": CAMERA_ID,
        "cameraName": CAMERA_NAME,
        "location": LOCATION
    }
    headers = {"Authorization": FIREBASE_TOKEN}

    try:
        resp = requests.post(API_URL, files=files, data=data, headers=headers, timeout=10)
        resp.raise_for_status()
        result = resp.json()
    except Exception as e:
        print(f"[{timestamp_start}] [Frame {frame_idx}] Lỗi request ở {thread_name}: {e}")
        return {}

    timestamp_end = datetime.now().strftime("%H:%M:%S.%f")
    print(f"[{timestamp_end}] [Frame {frame_idx}] Hoàn thành gửi ở {thread_name}, Kết quả: {result}")

    # Nếu phát hiện khói/lửa, lưu frame
    if result.get("fire_detected") and result.get("class") in ["fire", "smoke"]:
        save_time = datetime.now().strftime("%Y%m%d_%H%M%S")
        save_path = os.path.join(SAVE_DIR, f"{result['class']}_{frame_idx}_{save_time}.jpg")
        cv2.imwrite(save_path, frame)
        print(f"🔥 Lưu frame phát hiện {result['class']} tại {save_path} (Thread: {thread_name})")

    return result

# ================== MAIN ==================
def main():
    cap = cv2.VideoCapture(0)
    if not cap.isOpened():
        raise RuntimeError("Không mở được webcam laptop")

    frame_idx = 0
    sent_count = 0
    futures = []

    print("💻 Bắt đầu stream webcam... Nhấn Q để thoát.")

    while True:
        ret, frame = cap.read()
        if not ret:
            break
        frame_idx += 1

        # Hiển thị video trực tiếp
        cv2.imshow("Webcam Stream", frame)

        # Gửi mỗi SAMPLE_RATE frame
        if frame_idx % SAMPLE_RATE == 0:
            jpeg = encode_frame_jpeg(frame)
            future = executor.submit(send_frame, jpeg, frame_idx, frame.copy())
            futures.append(future)
            sent_count += 1

        # Thoát nếu nhấn Q
        if cv2.waitKey(1) & 0xFF == ord("q"):
            break

    # Chờ tất cả request hoàn thành trước khi kết thúc
    for future in as_completed(futures):
        future.result()  # log chi tiết đã có trong send_frame

    cap.release()
    cv2.destroyAllWindows()
    elapsed = time.time() - start_time
    print(f"Kết thúc. Gửi {sent_count} frames. Thời gian {elapsed:.1f}s")

if __name__ == "__main__":
    start_time = time.time()
    main()
