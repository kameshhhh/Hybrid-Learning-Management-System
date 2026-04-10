import { io, Socket } from "socket.io-client";
import toast from "react-hot-toast";

const SOCKET_URL = import.meta.env.VITE_API_URL?.replace("/api/v1", "") || "http://localhost:5000";

class SocketService {
  public socket: Socket | null = null;
  private token: string | null = null;
  public notificationCount = 0;
  private onNotificationCallback: ((count: number) => void) | null = null;

  onNotification(cb: (count: number) => void) {
    this.onNotificationCallback = cb;
  }

  connect(token: string) {
    if (this.socket?.connected && this.token === token) return;

    this.token = token;
    this.socket = io(SOCKET_URL, {
      auth: { token },
      transports: ["websocket", "polling"],
      reconnectionAttempts: 5,
    });

    this.socket.on("connect", () => {
      console.log("Socket connected:", this.socket?.id);
    });

    this.socket.on("notification", (data: any) => {
      this.notificationCount++;
      if (this.onNotificationCallback) this.onNotificationCallback(this.notificationCount);

      if (data.type === "success") toast.success(data.message);
      else if (data.type === "error") toast.error(data.message);
      else if (data.type === "warning") toast(data.message, { icon: "⚠️" });
      else toast(data.message);
    });

    this.socket.on("force:logout", (data: any) => {
      toast.error(`Forced Logout: ${data.reason}`);
      localStorage.removeItem("token");
      window.location.href = "/login";
    });

    this.socket.on("connect_error", (error) => {
      console.error("Socket connection error:", error.message);
    });
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }

  emit(event: string, data: any) {
    if (this.socket?.connected) {
      this.socket.emit(event, data);
    }
  }
}

export const socketService = new SocketService();
