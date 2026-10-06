const WS_BASE_URL =
    import.meta.env.MODE === "development"
        ? "ws://localhost:8080"
        : "ws://dev.app.skooljobs.com";

const NOTIFICATION_PATH = "/ws/notifications";

let socket = null;
let activeUserId = null;
let messageHandler = null;

export const buildNotificationSocketUrl = (userId) =>
    `${WS_BASE_URL}${NOTIFICATION_PATH}?userId=${encodeURIComponent(userId)}`;

const isLive = (ws) =>
    ws.readyState === WebSocket.CONNECTING || ws.readyState === WebSocket.OPEN;

export const disconnect = () => {
    messageHandler = null;

    if (!socket) {
        return;
    }

    const ws = socket;
    socket = null;
    activeUserId = null;

    ws.close(1000, "Client disconnect");
};

export const connect = (userId, onNotification) => {
    const id = userId === undefined || userId === null ? "" : String(userId);

    if (id.trim() === "") {
        console.warn("Notification WebSocket not connected: userId is missing.");
        return;
    }

    const handler =
        typeof onNotification === "function" ? onNotification : null;

    if (socket && activeUserId === id && isLive(socket)) {
        messageHandler = handler;
        return;
    }

    disconnect();
    messageHandler = handler;

    const ws = new WebSocket(buildNotificationSocketUrl(id));
    socket = ws;
    activeUserId = id;

    ws.onopen = () => {
        console.info("Notification WebSocket connected. userId=", id);
    };

    ws.onmessage = (event) => {
        if (socket !== ws) {
            return;
        }

        let notification;
        try {
            notification = JSON.parse(event.data);
        } catch (error) {
            console.warn("Ignoring non-JSON notification message:", event.data, error);
            return;
        }

        if (!messageHandler) {
            return;
        }

        try {
            messageHandler(notification);
        } catch (error) {
            console.error("Notification handler failed:", error);
        }
    };

    ws.onerror = (error) => {
        console.error("Notification WebSocket error:", error);
    };

    ws.onclose = (event) => {
        console.info(
            "Notification WebSocket closed. code=",
            event.code,
            "reason=",
            event.reason
        );

        if (socket === ws) {
            socket = null;
            activeUserId = null;
        }
    };
};
