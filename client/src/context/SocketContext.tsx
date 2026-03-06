import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState
} from "react";
import type {ReactNode} from "react";
import { io, Socket } from "socket.io-client";
import { useSelector } from "react-redux";
import type { RootState } from "../redux/store";

interface SocketContextValue {
  socket: Socket | null;
  isConnected: boolean;
}

const SocketContext = createContext<SocketContextValue | undefined>(undefined);

interface Props {
  children: ReactNode;
}

export const SocketProvider: React.FC<Props> = ({ children }) => {
  const token = useSelector((state: RootState) => state.user.token);

  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    console.log("Token:", token);
    if (!token?.trim()) return;
    const socketInstance = io(`${import.meta.env.VITE_API_URL}`, {
      transports: ["websocket"],
      auth: {
        token,
      },
      withCredentials: true,
    });

    setSocket(socketInstance);

    socketInstance.on("connect", () => {
      setIsConnected(true);
      console.log("✅ Socket connected:", socketInstance.id);
    });

    socketInstance.on("disconnect", () => {
      setIsConnected(false);
      console.log("❌ Socket disconnected");
    });

    return () => {
      socketInstance.disconnect();
      setSocket(null);
    };
  }, [token]);

  const value = useMemo(
    () => ({
      socket,
      isConnected,
    }),
    [socket, isConnected]
  );

  return (
    <SocketContext.Provider value={value}>
      {children}
    </SocketContext.Provider>
  );
};

export const useSocket = (): SocketContextValue => {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error("useSocket must be used within SocketProvider");
  }
  return context;
};
