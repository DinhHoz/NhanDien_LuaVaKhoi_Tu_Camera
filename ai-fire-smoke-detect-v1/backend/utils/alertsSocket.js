import admin from "../firebase/admin.js";
import { FieldPath } from "firebase-admin/firestore";

const clients = new Map();

export function setupAlertsWs(app) {
  console.log("⚡ WS ALERT ROUTE MOUNTED"); // <== LOG NÀY GIÚP XÁC NHẬN ROUTE ĐƯỢC MOUNT

  app.ws("/api/alerts/live", async (ws, req) => {
    console.log("🔌 WS NEW CONNECTION:", req.query); // <== LOG TOKEN CLIENT GỬI LÊN

    const token = req.query?.token;
    if (!token) {
      console.log("❌ WS ERROR: Missing token");
      ws.close();
      return;
    }

    let userId;
    try {
      const decoded = await admin.auth.verifyIdToken(token);
      userId = decoded.uid;

      console.log("✅ WS TOKEN VERIFIED for user:", userId); // <== LOG XÁC NHẬN TOKEN HỢP LỆ
    } catch (err) {
      console.log("❌ WS TOKEN INVALID");
      ws.close();
      return;
    }

    // Thêm client vào danh sách
    if (!clients.has(userId)) clients.set(userId, new Set());
    clients.get(userId).add(ws);

    console.log("📡 WS CONNECTED:", userId, "Total connections:", clients.get(userId).size);

    ws.on("close", () => {
      const set = clients.get(userId);
      if (!set) return;

      set.delete(ws);
      if (set.size === 0) clients.delete(userId);

      console.log("🔌 WS CLOSED for user:", userId);
    });
  });
}

export function broadcastToUser(userId, data) {
  const sockets = clients.get(userId);
  if (!sockets) {
    console.log("⚠️ No open WS for user:", userId); // <== LOG ĐỂ BIẾT VÌ SAO KHÔNG GỬI ĐƯỢC
    return;
  }

  const json = JSON.stringify(data);

  for (const ws of sockets) {
    if (ws.readyState === ws.OPEN) {
      ws.send(json);
    } else {
      console.log("⚠️ WS not open, skip sending.");
    }
  }
}

export async function broadcastAlertToCameraUsers(cameraId, data, targetUserId = null) {
  const db = admin.firestore;

  try {
    const notifiedUsers = new Set();

    // 1. Gửi trực tiếp cho user mục tiêu (Ưu tiên tốc độ tối đa cho người đang xem)
    if (targetUserId) {
      console.log(`📤 Direct broadcasting alert to user: ${targetUserId}`);
      broadcastToUser(targetUserId, data);
      notifiedUsers.add(targetUserId);
    }

    // 2. Tìm tất cả các user khác cũng sở hữu camera này
    // Lưu ý: Vì Firestore collectionGroup.where(documentId) bị giới hạn, 
    // chúng ta sẽ quét qua các user để tìm chính xác ai có camera này.
    console.log(`🔍 Finding shared owners for camera: ${cameraId}`);
    const usersSnap = await db.collection("users").get();

    for (const userDoc of usersSnap.docs) {
      if (notifiedUsers.has(userDoc.id)) continue;

      const camDoc = await userDoc.ref.collection("cameras").doc(cameraId).get();
      if (camDoc.exists) {
        console.log(`📤 Shared broadcast to user: ${userDoc.id}`);
        broadcastToUser(userDoc.id, data);
        notifiedUsers.add(userDoc.id);
      }
    }
  } catch (err) {
    console.log("❌ Broadcast error:", err);
  }
}
