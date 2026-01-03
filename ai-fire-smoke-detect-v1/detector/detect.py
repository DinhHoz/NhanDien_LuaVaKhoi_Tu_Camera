import os
import cv2
import warnings
import logging
import numpy as np
from ultralytics import YOLO
from fastapi import FastAPI, UploadFile, File
import uvicorn
import asyncio
from concurrent.futures import ThreadPoolExecutor

# Vô hiệu hóa cảnh báo và log
warnings.filterwarnings("ignore")
logging.getLogger().setLevel(logging.CRITICAL)

# Load model 1 lần
model_path = os.path.join(os.path.dirname(__file__), "fireandsmoke.pt")
model = YOLO(model_path)

app = FastAPI()

# Thread pool executor để chạy inference đa luồng
executor = ThreadPoolExecutor(max_workers=4)  #  có thể tăng số luồng tuỳ CPU

def run_inference(img_bytes: bytes):
    nparr = np.frombuffer(img_bytes, np.uint8)
    img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
    if img is None:
        return {"fire_detected": False, "class": "none", "confidence": None, "error": "Unable to decode image"}

    results = model.predict(source=img, save=False, imgsz=(640, 640), conf=0.4, verbose=False)
    boxes = results[0].boxes
    names = results[0].names

    if boxes and len(boxes.cls) > 0:
        best_idx = int(boxes.conf.argmax())
        cls = int(boxes.cls[best_idx])
        label = names[cls]
        confidence = float(boxes.conf[best_idx])
        
        print(f"Detected: {label}, Confidence: {confidence:.4f}")
        return {"fire_detected": True, "class": label, "confidence": round(confidence, 4)}
    else:
        print("No detection")
        return {"fire_detected": False, "class": "none", "confidence": None}

@app.post("/detect")
async def detect(image: UploadFile = File(...)):
    img_bytes = await image.read()
    # Chạy run_inference trên thread pool để không block event loop
    loop = asyncio.get_event_loop()
    result = await loop.run_in_executor(executor, run_inference, img_bytes)
    return result

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)
#uvicorn detect:app --reload --host 0.0.0.0 --port 8000