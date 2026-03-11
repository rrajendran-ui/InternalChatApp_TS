import React, { useEffect, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import Avatar from "./Avatar";
import { HiDotsVertical } from "react-icons/hi";
import { FaAngleLeft } from "react-icons/fa";
import { FaPlus, FaImage, FaVideo, FaPaperclip, FaUser } from "react-icons/fa6";
import { IoClose, IoSend } from "react-icons/io5";
import { FiCheck, FiEdit2, FiMoreVertical, FiPlus, FiX } from "react-icons/fi";
import uploadFile from "../helpers/uploadFile";
import Loading from "./Loading";
import backgroundImage from "../assets/wallapaper.jpeg";
import moment from "moment";
import { useAppSelector } from "../redux/hooks";
import { GoogleGenerativeAI } from "@google/generative-ai";
import type { IMessage, IConversationSummary } from "../redux/types";
import { useSocket } from "../context/SocketContext";
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { format, isToday, isYesterday } from "date-fns";

const MessagePage: React.FC = () => {
  const { topicId } = useParams<{ topicId?: string }>();
  const { socket } = useSocket();
  const user = useAppSelector((state) => state.user);

  const [editingMsgId, setEditingMsgId] = useState<string | null>(null);
  const [editText, setEditText] = useState("");

  const editorRef = useRef<HTMLDivElement | null>(null);
  const scrollRef = useRef<HTMLDivElement | null>(null);

  const [topicData, setTopicData] = useState<IConversationSummary>({
    _id: "",
    topic: "",
    topicImage: "",
    lastMessage: undefined,
    unseenMsg: 0,
    memberCount: 0,
  });

  const [openImageVideoUpload, setOpenImageVideoUpload] = useState(false);
  const [loading, setLoading] = useState(false);
  const [allMessage, setAllMessage] = useState<IMessage[]>([]);

  const [message, setMessage] = useState<Partial<IMessage>>({
    text: "",
    imageUrl: "",
    videoUrl: "",
    fileUrl: "",
    fileName: "",
  });

  const ai = new GoogleGenerativeAI(import.meta.env.VITE_GOOGLE_AI_KEY);

  /* AUTO SCROLL */
  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [allMessage]);

  const formatChatDate = (date: Date) => {
    if (isToday(date)) return "Today";
    if (isYesterday(date)) return "Yesterday";
    return format(date, "dd MMMM");
  };

  const groupMessagesByDate = (messages: IMessage[]) => {
    return messages.reduce((groups: Record<string, IMessage[]>, msg) => {
      const key = new Date(msg.createdAt).toISOString().split("T")[0];
      if (!groups[key]) groups[key] = [];
      groups[key].push(msg);
      return groups;
    }, {});
  };

  const groupedMessages = groupMessagesByDate(allMessage);

  /* FILE UPLOAD */

  const handleUploadImage = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setLoading(true);
    const uploadUrl = await uploadFile(file);
    setLoading(false);

    if (file.type.startsWith("image/")) {
      setMessage((prev) => ({ ...prev, imageUrl: uploadUrl.url }));
    } else {
      setMessage((prev) => ({
        ...prev,
        fileUrl: uploadUrl.url,
        fileName: file.name,
      }));
    }
  };

  const handleUploadVideo = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setLoading(true);
    const uploadUrl = await uploadFile(file);
    setLoading(false);

    setMessage((prev) => ({ ...prev, videoUrl: uploadUrl.url }));
  };

  /* SOCKET EVENTS */

  useEffect(() => {
    if (!socket || !topicId) return;

    setAllMessage([]);

    socket.emit("join-topic", topicId);

    socket.on("topic-details", (topic: IConversationSummary) => {
      topic.memberCount = topic.participants?.length || 0;
      setTopicData(topic);
      socket.emit("load-messages", topicId);
    });

    socket.on("topic-messages", (msgs: IMessage[]) => {
      setAllMessage(msgs);
    });

    socket.on("new-topic-message", (msg: IMessage) => {
      setAllMessage((prev) => {
        if (prev.find((m) => m._id === msg._id)) return prev;
        return [...prev, msg];
      });
    });

    const handleUpdatedMessage = (updatedMsg: IMessage) => {
  setAllMessage((prev) =>
    prev.map((msg) =>
      msg._id === updatedMsg._id ? updatedMsg : msg
    )
  );
};

socket.on("message-updated", handleUpdatedMessage);
    return () => {
      socket.off("topic-details");
      socket.off("topic-messages");
      socket.off("new-topic-message");
      socket.off("message-updated");
    };
  }, [socket, topicId]);

  /* GET MESSAGE TEXT */

  const getMessageText = () => {
    if (!editorRef.current) return "";
    return editorRef.current.innerText.trim();
  };

  /* SEND MESSAGE */

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!socket || !topicId) return;

    const textValue = getMessageText();

    if (!textValue && !message.imageUrl && !message.videoUrl && !message.fileUrl)
      return;

    socket.emit("send-topic-message", {
      topicId,
      sender: user?._id,
      text: textValue,
      imageUrl: message.imageUrl,
      videoUrl: message.videoUrl,
      fileUrl: message.fileUrl,
      fileName: message.fileName,
    });

    if (editorRef.current) editorRef.current.innerHTML = "";

    setMessage({});
  };

  /* EDIT MESSAGE */

  const handleEditMessage = (msgId: string) => {
    if (!socket) return;

    socket.emit("update-message", {
      messageId: msgId,
      text: editText,
    });

    setEditingMsgId(null);
    setEditText("");
  };

  return (
    <div
      style={{ backgroundImage: `url(${backgroundImage})` }}
      className="bg-cover"
    >
      {/* HEADER */}

      <header className="sticky top-0 h-16 bg-white flex justify-between items-center px-4">

        <div className="flex items-center gap-4">
          <Link to="/" className="lg:hidden">
            <FaAngleLeft size={22} />
          </Link>

          <Avatar
            width={45}
            height={45}
            imageUrl={topicData.topicImage || ""}
            name={topicData.topic}
            userId={topicData._id}
          />

          <div>
            <h3 className="font-semibold text-lg">{topicData.topic}</h3>
          </div>
        </div>

        <div className="flex items-center gap-1 text-xs text-gray-500">
          <FaUser size={12} />
          <span className="font-bold text-[11px]">
            +{topicData.memberCount}
          </span>
        </div>

        <HiDotsVertical />
      </header>

      {/* MESSAGE AREA */}

      <section className="h-[calc(100vh-128px)] overflow-y-auto p-3">

        {Object.entries(groupedMessages).map(([date, msgs]) => (
          <div key={date}>

            <div className="text-center text-xs text-gray-400 my-4">
              {formatChatDate(new Date(date))}
            </div>

            {msgs.map((msg) => (

              <div
                key={msg._id}
                className={`group relative max-w-md p-2 rounded mb-2 ${
                  user?._id === msg.sender
                    ? "ml-auto bg-teal-100"
                    : "bg-white"
                }`}
              >

                {editingMsgId === msg._id ? (
                  <div>

                    <textarea
                      value={editText}
                      onChange={(e) => setEditText(e.target.value)}
                      className="w-full border rounded p-2 text-sm"
                    />

                    <div className="flex gap-3 mt-2 justify-end">
                      <FiCheck
                        className="cursor-pointer"
                        onClick={() => handleEditMessage(msg._id)}
                      />
                      <FiX
                        className="cursor-pointer"
                        onClick={() => setEditingMsgId(null)}
                      />
                    </div>

                  </div>
                ) : (
                  <div>

                    {msg.imageUrl && (
                      <img src={msg.imageUrl} className="rounded mb-1" />
                    )}

                    {msg.videoUrl && (
                      <video src={msg.videoUrl} controls />
                    )}

                    {msg.fileUrl && (
                      <a
                        href={msg.fileUrl}
                        target="_blank"
                        className="text-blue-600 underline"
                      >
                        {msg.fileName}
                      </a>
                    )}

                    <Markdown remarkPlugins={[remarkGfm]}>
                      {msg.text}
                    </Markdown>
                    {msg.isEdited && (
  <span className="text-[10px] text-gray-400 ml-2">Edited</span>
)}
                    <p className="text-xs text-right">
                      {moment(msg.createdAt).format("hh:mm A")}
                    </p>

                  </div>
                )}

                {user?._id === msg.sender && editingMsgId !== msg._id && (
                  <div className="absolute top-[-15px] right-0 hidden group-hover:flex gap-2 bg-white shadow px-2 py-1 rounded">

                    <FiEdit2
                      className="cursor-pointer"
                      onClick={() => {
                        setEditingMsgId(msg._id);
                        setEditText(msg.text);
                      }}
                    />

                    <FiMoreVertical />

                  </div>
                )}

              </div>

            ))}

          </div>
        ))}

        <div ref={scrollRef}></div>

        {loading && <Loading />}

      </section>

      {/* SEND MESSAGE */}

      <section className="h-16 bg-white flex items-center px-4">

        <button
          onClick={() =>
            setOpenImageVideoUpload((prev) => !prev)
          }
          className="w-10 h-10 flex justify-center items-center rounded-full hover:bg-gray-200"
        >
          <FaPlus />
        </button>

        {openImageVideoUpload && (
          <div className="absolute bottom-16 bg-white shadow rounded w-36 p-2">

            <label className="flex items-center gap-2 p-2 cursor-pointer hover:bg-gray-100">
              <FaImage /> Image
              <input type="file" hidden onChange={handleUploadImage} />
            </label>

            <label className="flex items-center gap-2 p-2 cursor-pointer hover:bg-gray-100">
              <FaVideo /> Video
              <input type="file" hidden onChange={handleUploadVideo} />
            </label>

            <label className="flex items-center gap-2 p-2 cursor-pointer hover:bg-gray-100">
              <FaPaperclip /> File
              <input type="file" hidden onChange={handleUploadImage} />
            </label>

          </div>
        )}

        <form
          onSubmit={handleSendMessage}
          className="flex gap-2 w-full ml-2"
        >

          <div
            ref={editorRef}
            contentEditable
            className="flex-1 border rounded-xl px-3 py-2"
          />

          <button className="text-primary">
            <IoSend size={26} />
          </button>

        </form>

      </section>

    </div>
  );
};

export default MessagePage;