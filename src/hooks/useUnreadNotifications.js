import { useCallback, useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import {
    hasUnreadNotifications,
    markNotificationsRead,
    setPushUnreadFlag,
} from "@/utils/notificationInbox.js";

export function useUnreadNotifications(studentId) {
    const [hasUnread, setHasUnread] = useState(false);
    const location = useLocation();

    const refresh = useCallback(async () => {
        if (!studentId) {
            setHasUnread(false);
            return;
        }
        setHasUnread(await hasUnreadNotifications(studentId));
    }, [studentId]);

    const markRead = useCallback(async () => {
        if (!studentId) return;
        await markNotificationsRead(studentId);
        setHasUnread(false);
    }, [studentId]);

    useEffect(() => {
        refresh();
    }, [refresh]);

    useEffect(() => {
        if (location.pathname === "/notifications") {
            markRead();
        }
    }, [location.pathname, markRead]);

    useEffect(() => {
        function onMessage(event) {
            if (event.data?.type !== "NOTIFICATION_RECEIVED" || !studentId) return;
            setPushUnreadFlag(studentId);
            setHasUnread(true);
        }

        navigator.serviceWorker?.addEventListener("message", onMessage);
        return () => navigator.serviceWorker?.removeEventListener("message", onMessage);
    }, [studentId]);

    return { hasUnread, markRead, refresh };
}
