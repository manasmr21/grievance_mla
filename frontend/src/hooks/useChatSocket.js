import { useState, useEffect, useRef, useCallback } from 'react';
import { io } from 'socket.io-client';
import { chatApi } from '../services/api/api';

const disconnectSocket = (socket, chatId) => {
  if (!socket) return;
  try {
    if (chatId) socket.emit('leaveChat', { chatId });
    socket.removeAllListeners();
    socket.disconnect();
  } catch {
    // ignore disconnect errors
  }
};

/**
 * Manages the full Socket.IO chat lifecycle for a grievance chat room.
 *
 * Pass `grievance` to activate the connection; pass `null` / `undefined` to
 * keep the hook dormant (useful when a tab is not yet open).
 *
 * @param {object|null} grievance - The grievance object from the server
 * @returns {{ messages, chatData, chatLoading, chatError, sendMessage }}
 */
export const useChatSocket = (grievance) => {
  const [messages, setMessages] = useState([]);
  const [chatData, setChatData] = useState(null);
  const [chatLoading, setChatLoading] = useState(false);
  const [chatError, setChatError] = useState(null);

  const socketRef = useRef(null);
  const chatIdRef = useRef(null);
  const generationRef = useRef(0);

  useEffect(() => {
    if (!grievance?.id) return;

    const generation = ++generationRef.current;

    const initChat = async () => {
      setChatLoading(true);
      setChatError(null);

      try {
        const chatRes = await chatApi.createChat({
          grievance_id: grievance.id,
          user1_id: grievance.id,
          user2_ids: Array.isArray(grievance.current_assigned_employee_id)
            ? grievance.current_assigned_employee_id
            : grievance.current_assigned_employee_id
              ? [grievance.current_assigned_employee_id]
              : [],
          user1_role_id: 3,
          user2_role_ids: Array.isArray(grievance.assignedEmployees)
            ? grievance.assignedEmployees.map((emp) => (
              Array.isArray(emp.role_ids) && emp.role_ids.length > 0 ? emp.role_ids[0] : null
            ))
            : [],
        });

        if (generationRef.current !== generation) return;

        if (!chatRes) {
          setChatError('Failed to initialize chat room.');
          return;
        }

        const chatId = chatRes.id || chatRes.data?.id;
        if (!chatId) {
          console.error('No chatId returned from createChat', chatRes);
          setChatError('Chat room could not be created.');
          return;
        }

        chatIdRef.current = chatId;
        setChatData(chatRes);

        const msgRes = await chatApi.getMessages(chatId);
        if (generationRef.current !== generation) return;

        if (msgRes && Array.isArray(msgRes)) {
          setMessages(msgRes);
        } else if (msgRes && Array.isArray(msgRes.data)) {
          setMessages(msgRes.data);
        }

        const newSocket = io(import.meta.env.VITE_BASE_URL, {
          withCredentials: true,
          transports: ['websocket'],
        });

        if (generationRef.current !== generation) {
          disconnectSocket(newSocket, chatId);
          return;
        }

        socketRef.current = newSocket;

        newSocket.on('connect', () => {
          newSocket.emit('joinChat', { chatId });
        });

        newSocket.on('connected', (data) => {
          console.log('Chat socket authenticated, userId:', data.userId);
        });

        newSocket.on('joinedChat', (data) => {
          if (generationRef.current === generation) setChatData(data.chatDetails);
        });

        newSocket.on('newMessage', (message) => {
          if (generationRef.current !== generation) return;
          setMessages((prev) => {
            if (prev.some((msg) => msg.id === message.id)) return prev;
            return [...prev, message];
          });
        });

        newSocket.on('error', (err) => {
          console.error('Chat socket error:', err?.message || err);
          if (generationRef.current === generation) {
            setChatError(err?.message || 'A chat error occurred.');
          }
        });

        newSocket.on('connect_error', (err) => {
          console.error('Chat socket connection error:', err.message);
          if (generationRef.current === generation) {
            setChatError('Unable to connect to chat. Please refresh the page.');
          }
        });
      } catch (err) {
        if (generationRef.current !== generation) return;
        console.error('Failed to initialize chat:', err);
        setChatError(err.message || 'Failed to initialize chat.');
      } finally {
        if (generationRef.current === generation) setChatLoading(false);
      }
    };

    initChat();

    return () => {
      generationRef.current += 1;
      const sock = socketRef.current;
      const chatId = chatIdRef.current;
      disconnectSocket(sock, chatId);
      socketRef.current = null;
      chatIdRef.current = null;
    };
  }, [grievance?.id]);

  const sendMessage = useCallback((message) => {
    const sock = socketRef.current;
    if (!sock || !sock.connected) {
      console.error('Chat connection is not established yet.');
      return false;
    }
    const chatId = chatIdRef.current;
    if (!chatId) {
      console.error('Chat data is missing.');
      return false;
    }
    if (!message.trim()) return false;

    sock.emit('sendMessage', { chatId, message });
    return true;
  }, []);

  return { messages, chatData, chatLoading, chatError, sendMessage };
};

export default useChatSocket;
