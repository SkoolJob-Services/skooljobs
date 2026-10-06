import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Outlet } from "react-router-dom";
import NotificationToasts from "../components/NotificationToasts";
import {
  connect as connectNotificationSocket,
  disconnect as disconnectNotificationSocket,
} from "../services/websocketservice";

// Persistent parent of every /school/* route (including the standalone
// /school/profile page) so the notification socket survives navigation
// between them and is closed only when the school area is left or on logout.
const SchoolNotificationLayout = () => {
  const currentUser = useMemo(() => {
    try { return JSON.parse(localStorage.getItem("currentUser") || "{}"); } catch { return {}; }
  }, []);

  const notificationUserId = currentUser?.id ? String(currentUser.id) : null;

  const [toasts, setToasts] = useState([]);
  const toastIdRef = useRef(0);

  const dismissToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  useEffect(() => {
    if (!notificationUserId) return undefined;

    connectNotificationSocket(notificationUserId, (notification) => {
      if (!notification?.message) return;
      toastIdRef.current += 1;
      const id = toastIdRef.current;
      setToasts((prev) => [
        ...prev,
        { id, message: notification.message, msgType: notification.msgType },
      ]);
    });

    return () => disconnectNotificationSocket();
  }, [notificationUserId]);

  return (
    <>
      <NotificationToasts toasts={toasts} onDismiss={dismissToast} />
      <Outlet />
    </>
  );
};

export default SchoolNotificationLayout;
