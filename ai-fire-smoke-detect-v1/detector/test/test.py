import os
import cv2
import time
import numpy as np
from ultralytics import YOLO

# ================================
# 1. Load model
# ================================
model_path = "detector/fireandsmoke.pt"   # đổi nếu tên khác
print(f"Loading model: {model_path}")
model = YOLO(model_path)
print("Model loaded successfully!\n")

# ================================
# 2. Benchmark trên video
# ================================
def benchmark_video(video_path):
    print(f"Benchmarking video: {video_path}")

    cap = cv2.VideoCapture(video_path)
    if not cap.isOpened():
        print("❌ Cannot open video.")
        return

    frames = 0
    inference_times = []

    start_time = time.time()

    while True:
        ret, frame = cap.read()
        if not ret:
            break

        t1 = time.time()
        model.predict(frame, verbose=False)
        t2 = time.time()

        inference_times.append(t2 - t1)
        frames += 1

    end_time = time.time()

    cap.release()

    # Tính toán
    total_time = end_time - start_time
    fps = frames / total_time if total_time > 0 else 0
    avg_infer = (sum(inference_times) / len(inference_times)) * 1000 if inference_times else 0

    print(f"Total frames: {frames}")
    print(f"Total time: {total_time:.3f} s")
    print(f"➡ FPS: {fps:.2f}")
    print(f"➡ Avg inference time: {avg_infer:.2f} ms/frame\n")

    return {
        "frames": frames,
        "fps": fps,
        "avg_inference_ms": avg_infer,
        "video": video_path
    }

# ================================
# 3. Chạy test trên nhiều video
# ================================
if __name__ == "__main__":
    test_videos = [
        "detector/test/test-video.mp4",
    ]

    print("===== YOLO Benchmark Test =====\n")

    results = []
    for vid in test_videos:
        if os.path.exists(vid):
            results.append(benchmark_video(vid))
        else:
            print(f"⚠ Video not found: {vid}\n")

    print("===== SUMMARY =====")
    for r in results:
        print(f"{r['video']}: FPS={r['fps']:.2f}, Avg Infer={r['avg_inference_ms']:.2f} ms")
