import { auth } from "../firebase/admin.js";

export async function decodeWSToken(req, cb) {
  try {
    const token = req.query.token;
    if (!token) return cb(null);

    const decoded = await auth.verifyIdToken(token);
    cb(decoded.uid);
  } catch {
    cb(null);
  }
}
