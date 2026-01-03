import { initializeApp, cert, applicationDefault } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";
import serviceAccount from "../serviceAccountKey.json" assert { type: "json" };
import { getMessaging } from "firebase-admin/messaging";
const app = initializeApp({
  credential: cert(serviceAccount),
});

const auth = getAuth(app);
const firestore = getFirestore(app);
const messaging = getMessaging(app);
export default {
  auth,
  firestore,
  messaging,
};
