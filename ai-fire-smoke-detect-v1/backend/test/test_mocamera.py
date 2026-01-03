import av
import cv2
import requests
import io
import time
from datetime import datetime

# ================= CẤU HÌNH =================
API_URL = "http://localhost:3000/api/detect"
FIELD_NAME = "image"
SAMPLE_RATE = 10   # Gửi 1 frame mỗi 10 frame

# Camera RTSP
RTSP_URL = "rtsp://admin:Hieucamera@192.168.1.76:554/onvif1"
CAMERA_ID = "CAM_RTSP_01"
CAMERA_NAME = "RTSP Camera"
LOCATION = "Phòng Test"

# Token Firebase (nếu backend yêu cầu)
FIREBASE_TOKEN = "Bearer eyJhbGciOiJSUzI1NiIsImtpZCI6IjUwMDZlMjc5MTVhMTcwYWIyNmIxZWUzYjgxZDExNjU0MmYxMjRmMjAiLCJ0eXAiOiJKV1QifQ.eyJpc3MiOiJodHRwczovL3NlY3VyZXRva2VuLmdvb2dsZS5jb20vYWktZGV0ZWN0LWZpcmUtc21va2UiLCJhdWQiOiJhaS1kZXRlY3QtZmlyZS1zbW9rZSIsImF1dGhfdGltZSI6MTc1ODA4MzIwNywidXNlcl9pZCI6IlhzMDZ0V2hOdlRZbktiS3pvWTNXMXpkYUIyRjIiLCJzdWIiOiJYczA2dFdoTnZUWW5LYkt6b1kzVzF6ZGFCMkYyIiwiaWF0IjoxNzU4MDgzMjA3LCJleHAiOjE3NTgwODY4MDcsImVtYWlsIjoiYWRtaW5AZ21haWwuY29tIiwiZW1haWxfdmVyaWZpZWQiOmZhbHNlLCJmaXJlYmFzZSI6eyJpZGVudGl0aWVzIjp7ImVtYWlsIjpbImFkbWluQGdtYWlsLmNvbSJdfSwic2lnbl9pbl9wcm92aWRlciI6InBhc3N3b3JkIn19.KFWfdKoxsvc6SWVq0E5hTFoCga_eTh-ONnkeBi3G6COzcCpmqWB_3rT0qLkfnN8m0Go5vggscNRaW2SWfW3Lr_QnmQwF19OQBPjpohK2A4FYZ3jnkSyiIh7oZQJ8k_bLnlmndJT5kK2efxKkc-CCHbmfzQOebIqv8jSCyqRyT0dAOUWikVtOkLNs8tv3o1pVRBWlrUiT11goja_rSvlarUzUDs72z490XETuF2sLylGaXP9sAFzY158oQPfr_qLNG09qJNsDf1Cw-Md6CuFmkXJGyJ1oKkJJ__BRGqlQ4Mzr8DFuUHzBNLU8l1E5Gjfm4YUzNtMT1XZobDWXsMID5g"

# ============================================

def encode_frame_jpeg(frame) -> bytes:
    """Chuyển frame AV -> JPEG bytes"""
    img = frame.to_ndarray(format="bgr24")
    ret, buf = cv2.imencode(".jpg", img, [int(cv2.IMWRITE_JPEG_QUALITY), 90])
    if not ret:
        raise RuntimeError("❌ Không encode được frame sang JPEG")
    return buf.tobytes(), img


def main():
    print(f"🔎 Đang kết nối tới camera: {RTSP_URL}")
    container = av.open(RTSP_URL)

    frame_idx = 0
    sent_count = 0
    start_time = time.time()

    for frame in container.decode(video=0):
        frame_idx += 1

        # Chuyển frame sang numpy để hiển thị
        jpeg, img = encode_frame_jpeg(frame)

        # Hiển thị video
        cv2.imshow("RTSP Camera (AV)", img)

        # Gửi mỗi SAMPLE_RATE frame
        if frame_idx % SAMPLE_RATE == 0:
            try:
                files = {FIELD_NAME: ("frame.jpg", io.BytesIO(jpeg), "image/jpeg")}
                data = {"cameraId": CAMERA_ID, "cameraName": CAMERA_NAME, "location": LOCATION}
                headers = {"Authorization": FIREBASE_TOKEN}

                resp = requests.post(API_URL, files=files, data=data, headers=headers, timeout=10)
                resp.raise_for_status()
                result = resp.json()

                print(f"[Frame {frame_idx}] ✅ Response:", result)
                sent_count += 1

                if result.get("fire_detected") and result.get("class") in ["fire", "smoke"]:
                    timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
                    print(f"🔥 Phát hiện {result['class']} lúc {timestamp}")

            except Exception as e:
                print(f"[Frame {frame_idx}] ❌ Lỗi request: {e}")

        # Nhấn Q để thoát
        if cv2.waitKey(1) & 0xFF == ord("q"):
            break

    cv2.destroyAllWindows()
    elapsed = time.time() - start_time
    print(f"✅ Kết thúc. Đã gửi {sent_count} frames trong {elapsed:.1f}s")


if __name__ == "__main__":
    main()
