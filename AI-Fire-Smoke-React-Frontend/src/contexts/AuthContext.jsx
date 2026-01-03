import { createContext, useContext, useState, useEffect } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { getDoc, doc } from "firebase/firestore";
import { auth, db } from "../firebase";

const AuthContext = createContext();
export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }) {
    const [currentUser, setCurrentUser] = useState(null);
    const [role, setRole] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (user) => {
            if (user) {
                setCurrentUser(user);

                try {
                    const snap = await getDoc(doc(db, "users", user.uid));

                    if (snap.exists()) {
                        const userData = snap.data();
                        setRole(userData.role || "user");
                        console.log("Auth loaded:", user.uid, "role:", userData.role);
                    } else {
                        console.warn("Không tìm thấy document user:", user.uid);
                        setRole("user");
                    }
                } catch (err) {
                    console.error("Lỗi khi load dữ liệu user:", err);
                    setRole("user");
                }

            } else {
                console.log("User đã logout.");
                setCurrentUser(null);
                setRole(null);
            }

            setLoading(false);
        });

        return () => unsubscribe();
    }, []);

    return (
        <AuthContext.Provider value={{ currentUser, role, loading }}>
            {loading ? (
                <div className="flex justify-center items-center h-screen text-gray-600">
                    Đang xác thực người dùng...
                </div>
            ) : (
                children
            )}
        </AuthContext.Provider>
    );
}
