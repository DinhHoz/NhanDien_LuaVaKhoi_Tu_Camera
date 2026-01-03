import admin from "../firebase/admin.js";

export async function verifyToken(req, res, next) {
  // --- Worker secret bypass ---
  const workerSecret = req.headers["x-worker-secret"];
  if (workerSecret && workerSecret === process.env.WORKER_SECRET) {
    req.uid = "worker-service"; // gán UID đặc biệt cho worker
    return next();
  }

  // --- Firebase Auth normal flow ---
  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).send("Missing token");

  const token = authHeader.split(" ")[1] || req.query.token;
  try {
    const decoded = await admin.auth.verifyIdToken(token);
    req.uid = decoded.uid;
    next();
  } catch (err) {
    res.status(403).send("Invalid token");
  }
}
