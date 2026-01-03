import admin from "../firebase/admin.js";
import { addClient, removeClient } from "../utils/alertsSocket.js";

export default function setupAlertsWs(app) {
  app.ws("/api/alerts/live", async (ws, req) => {
    const token = req.query?.token;

    if (!token) {
      ws.close();
      return;
    }

    let userId = null;

    try {
      const decoded = await admin.auth().verifyIdToken(token);
      userId = decoded.uid;
    } catch (err) {
      console.log("WS alert token verify failed:", err.message);
      ws.close();
      return;
    }

    addClient(userId, ws);
    console.log("Alerts WS connected:", userId);

    ws.on("close", () => {
      removeClient(userId, ws);
      console.log("Alerts WS disconnected:", userId);
    });
  });
}
