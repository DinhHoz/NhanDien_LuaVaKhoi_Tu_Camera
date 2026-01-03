import { Toaster } from "react-hot-toast";

export default function ToastLayout() {
    return (
        <Toaster
            position="top-right"
            toastOptions={{
                style: {
                    borderRadius: "12px",
                    background: "#1e293b",
                    color: "#fff",
                    padding: "12px 16px",
                    fontSize: "15px",
                },
                success: {
                    iconTheme: {
                        primary: "#22c55e",
                        secondary: "#fff",
                    },
                },
                error: {
                    iconTheme: {
                        primary: "#ef4444",
                        secondary: "#fff",
                    },
                },
            }}
        />
    );
}
