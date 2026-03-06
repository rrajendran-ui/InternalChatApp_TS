import React, { useEffect, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import Avatar from "./Avatar";
import { HiDotsVertical } from "react-icons/hi";
import { FaAngleLeft, FaPlus, FaImage, FaVideo, FaPaperclip } from "react-icons/fa6";
import { IoClose, IoSend } from "react-icons/io5";
import { FiEdit2, FiMoreVertical } from "react-icons/fi";
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
  
const MessagePage: React.FC = () => {
  const { topicId } = useParams<{ topicId?: string }>();
  const { socket } = useSocket();
  const user = useAppSelector((state) => state.user);

  const editorRef = useRef<HTMLDivElement | null>(null);
  const bottomRef = useRef<HTMLDivElement | null>(null);

  const [topicData, setTopicData] = useState<IConversationSummary>({
  _id: "",
  topic: "",
  topicImage: "",
  lastMessage: undefined,
  unseenMsg: 0
});

  const [openUpload, setOpenUpload] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);
  const [hover, setHover] = useState<string | null>(null);
  const [allMessage, setAllMessage] = useState<IMessage[]>([]);

  const [message, setMessage] = useState<Partial<IMessage>>({
    text: "",
    imageUrl: "",
    videoUrl: "",
    fileUrl: "",
    fileName: "",
  });

  const ai = new GoogleGenerativeAI(
    import.meta.env.VITE_GOOGLE_AI_KEY || ""
  );

  /* ---------------- SCROLL ---------------- */
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [allMessage]);

  /* ---------------- LOAD MESSAGES BY TOPIC ---------------- */
  useEffect(() => {
  if (!socket || !topicId) return;

  setAllMessage([]); 

  socket.emit("join-topic", topicId);
  
  const handleTopicDetails = (topic: IConversationSummary) => {
    setTopicData(topic);
  };
  socket.emit("load-messages", topicId);
  const handleTopicMessages = (messages: IMessage[]) => {
    setAllMessage(messages);
  };

  const handleNewMessage = (newMsg: IMessage) => {
    setAllMessage((prev) => {
      const exists = prev.some((msg) => msg._id === newMsg._id);
      if (exists) return prev;
      return [...prev, newMsg];
    });
  };

  socket.on("topic-details", handleTopicDetails);
  socket.on("topic-messages", handleTopicMessages);
  socket.on("new-topic-message", handleNewMessage);

  return () => {
    socket.off("topic-details", handleTopicDetails);
    socket.off("topic-messages", handleTopicMessages);
    socket.off("new-topic-message", handleNewMessage);
  };

}, [socket, topicId]);

  /* ---------------- HANDLE SEND ---------------- */
  const getMessageText = (): string => {
    if (!editorRef.current) return "";

    const cloned = editorRef.current.cloneNode(true) as HTMLElement;
    cloned
      .querySelectorAll("[contenteditable='false']")
      .forEach((el) => el.remove());

    return cloned.innerText.trim();
  };

  const handleSendMessage = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!socket || !topicId) return;

    const textValue = getMessageText();

    if (!textValue && !message.imageUrl && !message.fileUrl && !message.videoUrl)
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

    socket.on("new-topic-message", (newMsg: IMessage) => {
    setAllMessage((prev) => {
    const alreadyExists = prev.some((msg) => msg._id === newMsg._id);
    if (alreadyExists) return prev; // prevent duplicate
    return [...prev, newMsg];
  });
  });
    if (editorRef.current) editorRef.current.innerHTML = "";

    setMessage({
      text: "",
      imageUrl: "",
      videoUrl: "",
      fileUrl: "",
      fileName: "",
    });

    if (textValue.includes("@ai")) {
      const cleanMsg = textValue.replace("@ai", "").trim();
      getAiResponse(cleanMsg);
    }
  };

  /* ---------------- AI RESPONSE ---------------- */
  const getAiResponse = async (userMessage: string) => {
  try {
    const model = ai.getGenerativeModel({
      model: "gemini-1.5-flash",
    });

    const result = await model.generateContent(userMessage);
    const response = await result.response;
    const text = response.text();

    socket?.emit("send-topic-message", {
      topicId,
      sender: user?._id,
      text,
    });

  } catch (error: any) {
    console.error(error);
    alert(error.message);
  }
};

  /* ---------------- FILE UPLOAD ---------------- */
  const handleUpload = async (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const file = files[0];
    setLoading(true);

    const uploadRes = await uploadFile(file);
    setLoading(false);
    setOpenUpload(false);

    if (file.type.startsWith("image/")) {
      setMessage((prev) => ({ ...prev, imageUrl: uploadRes.url }));
    } else if (file.type.startsWith("video/")) {
      setMessage((prev) => ({ ...prev, videoUrl: uploadRes.url }));
    } else {
      setMessage((prev) => ({
        ...prev,
        fileUrl: uploadRes.url,
        fileName: file.name,
      }));
    }
  };

  /* ---------------- UI ---------------- */
  return (
    <div
      style={{ backgroundImage: `url(${backgroundImage})` }}
      className="bg-no-repeat bg-cover"
    >
      {/* HEADER */}
      <header className="sticky top-0 h-16 bg-white flex justify-between items-center px-4">
        <div className="flex items-center gap-4">
          <Link to="/" className="lg:hidden">
            <FaAngleLeft size={25} />
          </Link>

          <Avatar
            width={50}
            height={50}
            imageUrl={topicData.topicImage || ""}
            name={topicData.topic || "Topic"}
            userId={topicData._id}
          />

          <div>
            <h3 className="font-semibold text-lg"> {topicData.topic || "Topic"}</h3>
            <p className="text-sm text-slate-400">
            Topic Discussion
          </p>
            {/* <p className="text-sm">
              {dataUser.online ? (
                <span className="text-primary">online</span>
              ) : (
                <span className="text-slate-400">offline</span>
              )}
            </p> */}
          </div>
        </div>

        <HiDotsVertical />
      </header>

      {/* MESSAGES */}
      <section className="h-[calc(100vh-128px)] overflow-y-auto p-3">
        {allMessage.map((msg) => (
          <div
            key={msg._id}
            className={`p-2 rounded max-w-md mb-2 ${
              user?._id === msg.sender ? "ml-auto bg-teal-100" : "bg-white"
            }`}
            onMouseEnter={() => setHover(msg._id)}
            onMouseLeave={() => setHover(null)}
          >
            {msg.imageUrl && <img src={msg.imageUrl} />}
            {msg.videoUrl && <video src={msg.videoUrl} controls />}
            {msg.fileUrl && (
              <a href={msg.fileUrl} target="_blank" rel="noreferrer">
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
        ))}

        <div ref={bottomRef} />
      </section>

      {/* SEND MESSAGE */}
      <section className="h-16 bg-white flex items-center px-4">
        <button
          onClick={() => setOpenUpload(!openUpload)}
          className="w-10 h-10 rounded-full hover:bg-gray-200"
        >
          <FaPlus />
        </button>

        {openUpload && (
          <div className="absolute bottom-20 bg-white shadow p-3 rounded">
            <input type="file" onChange={handleUpload} />
          </div>
        )}

        <form
          onSubmit={handleSendMessage}
          className="flex gap-2 w-full ml-3"
        >
          <div
            ref={editorRef}
            contentEditable
            className="flex-1 border rounded px-3 py-2"
          />
          <button type="submit">
            <IoSend size={24} />
          </button>
        </form>
      </section>

      {loading && <Loading />}
    </div>
  );
};

export default MessagePage;