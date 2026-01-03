// src/contexts/NotificationContext.jsx
import { createContext, useContext, useState } from "react";

const NotificationContext = createContext();
export const useNotifications = () => useContext(NotificationContext);

export function NotificationProvider({ children }) {
    const [unreadCount, setUnreadCount] = useState(0);

    return (
        <NotificationContext.Provider value={{ unreadCount, setUnreadCount }}>
            {children}
        </NotificationContext.Provider>
    );
}
