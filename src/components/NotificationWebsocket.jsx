import { useEffect, useState } from "react";

const NotificationWebSocket = () => {
  const [notifications, setNotifications] = useState([]);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    const socket = new WebSocket(
      "ws://localhost:8080/ws/notifications"
    );

    socket.onopen = () => {
      console.log("WebSocket Connected");
      setConnected(true);

      // Temporary test userId
      socket.send("USER_ID");
    };

    socket.onmessage = (event) => {
      console.log("Notification Received:", event.data);

      try {
        const notification = JSON.parse(event.data);

        setNotifications((previousNotifications) => [
          notification,
          ...previousNotifications
        ]);
      } catch (error) {
        console.error(
          "Error parsing notification:",
          error
        );
      }
    };

    socket.onerror = (error) => {
      console.error("WebSocket Error:", error);
    };

    socket.onclose = () => {
      console.log("WebSocket Disconnected");
      setConnected(false);
    };

    return () => {
      socket.close();
    };
  }, []);

  return (
    <div>
      <h2>
        WebSocket Status:{" "}
        {connected ? "Connected" : "Disconnected"}
      </h2>

      <h3>Notifications</h3>

      {notifications.length === 0 ? (
        <p>No notifications received yet.</p>
      ) : (
        notifications.map((notification, index) => (
          <div key={index}>
            <strong>{notification.title}</strong>
            <p>{notification.message}</p>
            <small>{notification.type}</small>
          </div>
        ))
      )}
    </div>
  );
};

export default NotificationWebSocket;