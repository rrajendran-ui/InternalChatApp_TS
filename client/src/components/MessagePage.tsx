import React, { useEffect,  useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import Avatar from "./Avatar";
import { HiDotsVertical } from "react-icons/hi";
import { FaAngleLeft } from "react-icons/fa";
import { FaPlus, FaImage, FaVideo, FaPaperclip, FaUser } from "react-icons/fa6";
import { IoSend } from "react-icons/io5";
import { FiCheck, FiEdit2, FiMoreVertical, FiX } from "react-icons/fi";
import uploadFile from "../helpers/uploadFile";
import Loading from "./Loading";
import moment from "moment";
import { useAppSelector } from "../redux/hooks";
import { GoogleGenAI } from "@google/genai";
import type { IMessage, IConversationSummary } from "../redux/types";
import { useSocket } from "../context/SocketContext";
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { format, isToday, isYesterday } from "date-fns";

const MessagePage: React.FC = () => {
  const { topicId } = useParams<{ topicId?: string }>();
  const { socket } = useSocket();
  const user = useAppSelector((state) => state.user);
  const isFirstLoad = useRef(true);
  const [editingMsgId, setEditingMsgId] = useState<string | null>(null);
  const [editText, setEditText] = useState("");
  const [existingAttachment, setExistingAttachment] = useState<any>(null);
  const [newAttachment, setNewAttachment] = useState<File | null>(null);
  const editorRef = useRef<HTMLDivElement | null>(null);
  const [isScrolling, setIsScrolling] = useState(false);
  //const [showScrollBtn, setShowScrollBtn] = useState(false);
  //const [scrollPercent, setScrollPercent] = useState(0);
  const scrollTimeout = useRef<any>(null);
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

  const ai= new GoogleGenAI({ apiKey: "AIzaSyCUayp3te9fNVOqBt2SKjyuQtASiun26YA" });
  const handleScroll = () => {
  if (!bottomRef.current) return;

  // Show scrollbar
  setIsScrolling(true);

  clearTimeout(scrollTimeout.current);
  scrollTimeout.current = setTimeout(() => {
    setIsScrolling(false);
  }, 800);

  // Your existing button logic
  //setShowScrollBtn(scrollHeight - scrollTop - clientHeight > 100);
};
  /* AUTO SCROLL */ 
 const bottomRef  = useRef<HTMLDivElement | null>(null);
 useEffect(() => {
  if (!bottomRef.current) return;

  if (isFirstLoad.current) {
    setTimeout(() => {
      bottomRef.current?.scrollIntoView({ behavior: "auto" });
      isFirstLoad.current = false;
    }, 50);
  } else {
    bottomRef.current.scrollIntoView({ behavior: "smooth" });
  }
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
    setNewAttachment(e.target.files?.[0] || null)
    if (!file) return;

    setLoading(true);
    const uploadUrl = await uploadFile(file);
    setLoading(false);
    console.log("Upload URL:", uploadUrl);
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

  console.log("Joining topic:", topicId);
  isFirstLoad.current = true;  
  // CLEAR OLD DATA
  setAllMessage([]);

  // JOIN ROOM
  socket.emit("join-topic", topicId);

  /* HANDLERS */

  const handleTopicDetails = (topic: IConversationSummary) => {
    topic.memberCount = topic.participants?.length || 0;
    setTopicData(topic);

    // LOAD MESSAGES AFTER JOIN
    socket.emit("load-messages", topicId);
  };

  const handleTopicMessages = (msgs: IMessage[]) => {
    setAllMessage(msgs);
  };

  const handleNewMessage = (msg: IMessage) => {
    setAllMessage((prev) => {
      if (prev.find((m) => m._id === msg._id)) return prev;
      return [...prev, msg];
    });
  };

  const handleUpdatedMessage = (updatedMsg: IMessage) => {
    setAllMessage((prev) =>
      prev.map((msg) =>
        msg._id.toString() === updatedMsg._id.toString()
          ? updatedMsg
          : msg
      )
    );
  };

  /* REGISTER EVENTS */
  socket.on("topic-details", handleTopicDetails);
  socket.on("topic-messages", handleTopicMessages);
  socket.on("new-topic-message", handleNewMessage);
  socket.on("message-updated", handleUpdatedMessage);

  /* CLEANUP */
  return () => {
    socket.off("topic-details", handleTopicDetails);
    socket.off("topic-messages", handleTopicMessages);
    socket.off("new-topic-message", handleNewMessage);
    socket.off("message-updated", handleUpdatedMessage);
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
    if (allMessage.length === 1 || textValue.includes("@ai")) {
        let msg = textValue.replace("@ai", "").trim()
        getAiRespoonse(msg)
      }
  };
const getAiRespoonse = async (userMessage: string) => {
    try {
      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: userMessage,
      });
      if (!socket || !topicId) return;
      socket.emit("send-topic-message", {
      topicId,
      sender: user?._id,
      text: response.text,
      imageUrl: message.imageUrl,
      videoUrl: "",
      fileUrl: "",
      fileName: "",
    });
      setMessage({
        text: "",
        imageUrl: "",
        videoUrl: "",
        fileUrl: "",
        fileName: ""
      })
    } catch (error) {
      // alert(error.message)
    }
  }
  /* EDIT MESSAGE */

  const handleEditMessage = async (msgId: string) => {
    if (!socket) return;
    let imageUrl = existingAttachment?.type === "image" ? existingAttachment.url : "";
    let videoUrl = existingAttachment?.type === "video" ? existingAttachment.url : "";
    let fileUrl = existingAttachment?.type === "file" ? existingAttachment.url : "";
    let fileName = existingAttachment?.name || "";
    if (newAttachment) {
      if (newAttachment.type.startsWith("image")) {
        imageUrl = message.imageUrl || "";
        videoUrl = "";
        fileUrl = "";
        fileName = newAttachment.name
      }
      else if (newAttachment.type.startsWith("video")) {
        videoUrl = message.videoUrl;
        imageUrl = "";
        fileUrl = "";
        fileName = newAttachment.name
      }
      else {
        fileUrl = message.fileUrl || "";
        fileName = message.fileName || "";
        imageUrl = "";
        videoUrl = "";
      }
    }

    socket.emit("update-message", {
      messageId: msgId,
      text: editText,
      imageUrl,
      videoUrl,
      fileUrl,
      fileName,
    });

    setEditingMsgId(null);
    setEditText("");
    setNewAttachment(null);
    setExistingAttachment(null);
  };

  return (
    <div

      className="bg-white h-screen flex flex-col"
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

      <section 
  className="h-[calc(100vh-128px)] overflow-y-auto p-3 chat-scroll"
>
        {Object.entries(groupedMessages).map(([date, msgs]) => (
          <div key={date} ref={bottomRef} onScroll={handleScroll} onMouseEnter={() => setIsScrolling(true)}
  onMouseLeave={() => setIsScrolling(false)} className={`${
    isScrolling ? "scroll-visible" : "scroll-hidden"
  }`}>

            <div className="text-center text-xs text-gray-400 my-4">
              {formatChatDate(new Date(date))}
            </div>

            {msgs.map((msg) => (
              <div
                key={msg._id}
                className={`mb-3 flex flex-col group ${user?._id === (typeof msg.sender === "string" ? msg.sender : msg.sender._id) ? "items-end" : "items-start"
                  }`}
              >
                <div className="flex items-center gap-2 text-[11px] text-gray-500 mb-1 px-1">

                  {/* Username */}
                  <span className="font-semibold text-gray-700">
                    {user?._id === (typeof msg.sender === "string" ? msg.sender : msg.sender._id) ? "" : msg.sender.name || "User"}
                  </span>

                  {/* Edited label */}
                  {msg.isEdited && (
                    <span className="text-gray-400 italic">Edited</span>
                  )}
                </div>

                <div
                  key={msg._id}
                  className={`relative group p-2 max-w-[60%] rounded-lg px-3 py-2 ${user?._id === (typeof msg.sender === "string" ? msg.sender : (typeof msg.sender === "string" ? msg.sender : msg.sender._id))
                      ? "bg-teal-100"
                      : "bg-gray-100"
                    }`}
                >

                  {editingMsgId === msg._id ? (
                    <div className="border rounded-lg p-3 bg-white w-[700px]">

                      {/* TEXT EDIT */}
                      <textarea
                        value={editText}
                        onChange={(e) => setEditText(e.target.value)}
                        className="w-full border rounded p-2 text-sm"
                      />

                      {/* EXISTING ATTACHMENT */}
                      {existingAttachment && !newAttachment && (
                        <div className="relative mt-3 w-fit">

                          {existingAttachment.type === "image" && (
                            <img
                              src={existingAttachment.url}
                              className="h-28 rounded"
                            />
                          )}

                          {existingAttachment.type === "video" && (
                            <video
                              src={existingAttachment.url}
                              controls
                              className="h-28 rounded"
                            />
                          )}

                          {existingAttachment.type === "file" && (
                            <a
                              href={existingAttachment.url}
                              target="_blank"
                              className="text-blue-600 underline"
                            >
                              {existingAttachment.name}
                            </a>
                          )}

                          <button
                            onClick={() => setExistingAttachment(null)}
                            className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full px-2"
                          >
                            ✕
                          </button>

                        </div>
                      )}
                      {newAttachment && (
                        <div className="relative mt-3 w-fit">

                          {newAttachment.type.startsWith("image") && (
                            <img
                              src={URL.createObjectURL(newAttachment)}
                              className="h-28 rounded"
                            />
                          )}

                          {newAttachment.type.startsWith("video") && (
                            <video
                              src={URL.createObjectURL(newAttachment)}
                              controls
                              className="h-28 rounded"
                            />
                          )}

                          {!newAttachment.type.startsWith("image") &&
                            !newAttachment.type.startsWith("video") && (
                              <p className="text-sm">{newAttachment.name}</p>
                            )}

                          <button
                            onClick={() => setNewAttachment(null)}
                            className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full px-2"
                          >
                            ✕
                          </button>

                        </div>
                      )}
                      <div className="flex justify-end gap-3 mt-3">
                        <label className="cursor-pointer text-sm flex items-center gap-1 text-gray-600">
                          <FaPaperclip />
                          <input
                            type="file"
                            hidden
                            onChange={handleUploadImage}
                          />
                        </label>
                        <FiCheck
                          className="cursor-pointer text-green-600"
                          onClick={() => handleEditMessage(msg._id)}
                        />
                        <FiX
                          className="cursor-pointer text-gray-600"
                          onClick={() => setEditingMsgId(null)}
                        />
                      </div>

                    </div>
                  ) : (
                    <div>
                      {msg.imageUrl && (
                        <img src={msg.imageUrl} className="max-w-[300px] max-h-[300px] object-contain rounded-lg" />
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

                      <p className="text-xs text-right">
                        {moment(msg.createdAt).format("hh:mm A")}
                      </p>

                    </div>
                  )}

                  {user?._id === msg.sender._id && (
                    <div className="absolute -top-6 right-1 hidden group-hover:flex gap-2 bg-white shadow-md px-2 py-1 rounded-lg z-10">

                      <FiEdit2
                        className="cursor-pointer"
                        onClick={() => {
                          setEditingMsgId(msg._id);
                          setEditText(msg.text);
                          if (msg.imageUrl) {
                            setExistingAttachment({ type: "image", url: msg.imageUrl });
                          } else if (msg.videoUrl) {
                            setExistingAttachment({ type: "video", url: msg.videoUrl });
                          } else if (msg.fileUrl) {
                            setExistingAttachment({
                              type: "file",
                              url: msg.fileUrl,
                              name: msg.fileName,
                            });
                          }
                        }}
                      />

                      <FiMoreVertical />

                    </div>
                  )}

                </div>
              </div>
            ))}

          </div>
        ))}
 
        {loading && <Loading />}
      </section>

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