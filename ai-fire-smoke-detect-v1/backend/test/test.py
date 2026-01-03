import cv2
import requests
import io
import time

API_URL = "http://localhost:3000/api/detect"
FIELD_NAME = "image"
SAMPLE_RATE = 10       # gửi 1 frame mỗi 10 frame
VIDEO_PATH = r"D:\AI-fire-smoke-detect\backend\test\video\output.mp4"
CAMERA_ID = "CAM_01"
CAMERA_NAME = "Camera 01"
LOCATION = "Xưởng 1"
FIREBASE_TOKEN = "eyJhbGciOiJSUzI1NiIsImtpZCI6ImUzZWU3ZTAyOGUzODg1YTM0NWNlMDcwNTVmODQ2ODYyMjU1YTcwNDYiLCJ0eXAiOiJKV1QifQ.eyJpc3MiOiJodHRwczovL3NlY3VyZXRva2VuLmdvb2dsZS5jb20vYWktZGV0ZWN0LWZpcmUtc21va2UiLCJhdWQiOiJhaS1kZXRlY3QtZmlyZS1zbW9rZSIsImF1dGhfdGltZSI6MTc1ODAwNTAyNCwidXNlcl9pZCI6IlhzMDZ0V2hOdlRZbktiS3pvWTNXMXpkYUIyRjIiLCJzdWIiOiJYczA2dFdoTnZUWW5LYkt6b1kzVzF6ZGFCMkYyIiwiaWF0IjoxNzU4MDA1MDI0LCJleHAiOjE3NTgwMDg2MjQsImVtYWlsIjoiYWRtaW5AZ21haWwuY29tIiwiZW1haWxfdmVyaWZpZWQiOmZhbHNlLCJmaXJlYmFzZSI6eyJpZGVudGl0aWVzIjp7ImVtYWlsIjpbImFkbWluQGdtYWlsLmNvbSJdfSwic2lnbl9pbl9wcm92aWRlciI6InBhc3N3b3JkIn19.Zk3_4jYCbBpN8VoVbww2ultGXNgR7vGJgL32I5NW5Tvxl4i5CtxjO_hlJOWtOVM_T7AQBWB4gP3FNrq8pZdd0EHc_OSXrAAbLYQUOm8UStZ4ajkLoaA3KTarbvcWEf1QcpDIVHA_vR4aDEJX5Hu8z64QxUlKJAOvTjo33-Z_AVEUzRT-HqcPJvAl1DdBBbLHoZotvvw9hueNFmj8IyRR4tPbyQVMuqcF4gmpsvHK8qGUffMu9CDf_DlkxAZI_sNYYhVG7MAr9QpZ_IOQiRFU7slIFJufiDvM5dMhft-epZz8zx2Fa7JQJeM7p2E8b5UIlh0SRjiLmpwTggh443YVmQ"
ALERT_EXTRA_FRAME_COUNT = 5   # gửi thêm 5 frame khi phát hiện
ALERT_FRAME_INTERVAL = 5      # khoảng cách giữa các frame (giây)

def encode_frame_jpeg(frame) -> bytes:
    ret, buf = cv2.imencode('.jpg', frame, [int(cv2.IMWRITE_JPEG_QUALITY), 90])
    if not ret:
        raise RuntimeError("Không encode được frame sang JPEG")
    return buf.tobytes()

def main():
    cap = cv2.VideoCapture(VIDEO_PATH)
    if not cap.isOpened():
        raise RuntimeError(f"Không mở được video {VIDEO_PATH}")

    frame_idx = 0
    sent_count = 0
    start_time = time.time()
    send_extra_frames = 0
    last_extra_frame_time = 0

    while True:
        ret, frame = cap.read()
        if not ret:
            break
        frame_idx += 1

        cv2.imshow("Video Stream", frame)

        # Kiểm tra có cần gửi frame bình thường
        send_normal_frame = frame_idx % SAMPLE_RATE == 0

        # Kiểm tra có cần gửi thêm frame alert
        now = time.time()
        if send_extra_frames > 0 and now - last_extra_frame_time >= ALERT_FRAME_INTERVAL:
            send_normal_frame = True
            last_extra_frame_time = now
            send_extra_frames -= 1

        if not send_normal_frame:
            if cv2.waitKey(1) & 0xFF == ord("q"):
                break
            continue

        jpeg = encode_frame_jpeg(frame)
        files = {FIELD_NAME: ("frame.jpg", io.BytesIO(jpeg), "image/jpeg")}
        data = {
            "cameraId": CAMERA_ID,
            "cameraName": CAMERA_NAME,
            "location": LOCATION
        }
        headers = {"Authorization": f"Bearer {FIREBASE_TOKEN}"}

        try:
            resp = requests.post(API_URL, files=files, data=data, headers=headers, timeout=10)
            resp.raise_for_status()
            result = resp.json()
        except Exception as e:
            print(f"[Frame {frame_idx}] Lỗi request: {e}")
            if cv2.waitKey(1) & 0xFF == ord("q"):
                break
            continue

        print(f"[Frame {frame_idx}] Response:", result)
        sent_count += 1

        # Nếu phát hiện fire/smoke, bật cơ chế gửi 5 frame tiếp theo
        if result.get("fire_detected") and result.get("class") in ["fire", "smoke"]:
            send_extra_frames = ALERT_EXTRA_FRAME_COUNT
            last_extra_frame_time = time.time()

        if cv2.waitKey(1) & 0xFF == ord("q"):
            break

    cap.release()
    cv2.destroyAllWindows()
    elapsed = time.time() - start_time
    print(f"Kết thúc. Gửi {sent_count} frames. Thời gian {elapsed:.1f}s")

if __name__ == "__main__":
    main()
