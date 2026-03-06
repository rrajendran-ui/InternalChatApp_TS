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
import { format, isToday, isYesterday } from "date-fns";

const MessagePage: React.FC = () => {
  const { topicId } = useParams<{ topicId?: string }>();
  const { socket } = useSocket();
  const user = useAppSelector((state) => state.user);

  const editorRef = useRef<HTMLDivElement | null>(null);
  const [topicData, setTopicData] = useState<IConversationSummary>({
    _id: "",
    topic: "",
    topicImage: "",
    lastMessage: undefined,
    unseenMsg: 0,
  });

  const [openImageVideoUpload, setOpenImageVideoUpload] = useState(false);
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

  const ai = new GoogleGenerativeAI("");
  const currentMessage = useRef<HTMLDivElement | null>(null)

  /* SCROLL */
  useEffect(() => {
    if (currentMessage.current) {
      currentMessage.current.scrollIntoView({ behavior: 'smooth', block: 'end' })
    }
  }, [allMessage])
  const formatChatDate = (date: Date) => {
    if (isToday(date)) return "Today";
    if (isYesterday(date)) return "Yesterday";
    return format(date, "dd MMMM"); // 21 January 2026
  };
  function groupMessagesByDate(messages: IMessage[]): Record<string, IMessage[]> {
    return messages.reduce((groups, message) => {
      const dateKey = new Date(message.createdAt)
        .toISOString()
        .split("T")[0]; // YYYY-MM-DD

      if (!groups[dateKey]) {
        groups[dateKey] = [];
      }

      groups[dateKey].push(message);
      return groups;
    }, {} as Record<string, IMessage[]>);
  }
  const groupedMessages = groupMessagesByDate(allMessage);
  
  const handleUploadImageVideoOpen = () => {
    setOpenImageVideoUpload((prev) => !prev);
  };

  /* IMAGE UPLOAD */
  const handleUploadImage = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target?.files?.[0];
    if (!file) return;

    setLoading(true);
    const uploadUrl = await uploadFile(file);
    setLoading(false);
    setOpenImageVideoUpload(false);
    let filePath = ""; let imagePath = "";
    let fileName = "";
    if (!file.type.startsWith("image/") && !file.type.startsWith("video/")) {
      filePath = uploadUrl.url;
      fileName = file.name;
    }
    else {
      imagePath = uploadUrl.url;
    }
    setMessage(preve => {
      return {
        ...preve,
        imageUrl: imagePath,
        fileUrl: filePath,
        fileName: fileName
      }

    }
    );
  };

  const handleUploadVideo = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target?.files?.[0];
    if (!file) return;

    setLoading(true);
    const uploadUrl = await uploadFile(file);
    setLoading(false);
    setOpenImageVideoUpload(false);

    setMessage((prev) => ({ ...prev, videoUrl: uploadUrl.url }));
  };

  const handleClearUploadImage = () => {
    setMessage((prev) => ({ ...prev, imageUrl: "" }));
  };

  const handleClearUploadVideo = () => {
    setMessage((prev) => ({ ...prev, videoUrl: "" }));
  };

  /* LOAD TOPIC MESSAGES */
  useEffect(() => {
    if (!socket || !topicId) return;

    setAllMessage([]);

    socket.emit("join-topic", topicId);


    const handleTopicDetails = (topic: IConversationSummary) => {
      setTopicData(topic);
      socket.emit("load-messages", topicId);
    };

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

  /* GET TEXT */
  const getMessageText = (): string => {
    if (!editorRef.current) return "";
    const cloned = editorRef.current.cloneNode(true) as HTMLElement;
    cloned.querySelectorAll("[contenteditable='false']").forEach((el) => el.remove());
    return cloned.innerText.trim();
  };

  /* SEND MESSAGE */
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

  /* AI RESPONSE */
  const getAiResponse = async (userMessage: string) => {
    try {
      const model = ai.getGenerativeModel({ model: "gemini-1.5-flash-latest" });

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
 const removeFile = () => {
    setMessage({
      fileUrl: "",
      fileName: ""
    });
    
    editorRef.current?.focus();
  };

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
            <h3 className="font-semibold text-lg">{topicData.topic || "Topic"}</h3>
            <p className="text-sm text-slate-400">Topic Discussion</p>
          </div>
        </div>

        <HiDotsVertical />
      </header>

      {/* MESSAGES */}
      <section className="h-[calc(100vh-128px)] overflow-y-auto p-3">
        <div>
          {Object.entries(groupedMessages).map(([date, allMessage]) => (
            <div key={date}>
              <div className="text-center my-4 text-xs text-gray-400 p-1 py-1 rounded w-fit max-w-[280px] md:max-w-sm lg:max-w-md bg-white ml-[450px]">
                {formatChatDate(new Date(date))}
              </div>

              <div className="flex flex-col gap-2 py-2 mx-2">
                {allMessage.map((msg,index) => (
                  <div key={`${msg._id}-${msg.createdAt}`}
                  ref={index === allMessage.length - 1 ? currentMessage : null} 
                  className="mb-3 relative">
                    <div
                      className={`p-2 rounded max-w-md ${user?._id === msg.sender
                          ? "ml-auto bg-teal-100"
                          : "bg-white"
                        }`}
                      onMouseEnter={() => setHover(msg._id)}
                      onMouseLeave={() => setHover(null)}
                    >
                      {msg.imageUrl && <img src={msg.imageUrl} alt="" />}
                      {msg.videoUrl && <video src={msg.videoUrl} controls />}

                      {msg.fileUrl && (
                        <a
                          href={msg.fileUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 underline"
                        >
                          {msg.fileName}
                        </a>
                      )}

                      <Markdown remarkPlugins={[remarkGfm]}>
                        {msg.text}
                      </Markdown>

                      {hover === msg._id && user?._id === msg.sender && (
                        <div className="absolute right-0 -top-5 flex gap-2 bg-white shadow px-2 py-1 rounded">
                          <FiEdit2 size={16} />
                          <FiMoreVertical size={14} />
                        </div>
                      )}

                      <p className="text-xs w-fit ml-auto">
                        {moment(msg.createdAt).format("hh:mm A")}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* IMAGE PREVIEW */}
        {message.imageUrl && (
          <div className="w-full h-full sticky bottom-0 bg-slate-700 bg-opacity-30 flex justify-center items-center rounded overflow-hidden">
            <div
              className="w-fit p-2 absolute top-0 right-0 cursor-pointer hover:text-red-600"
              onClick={handleClearUploadImage}
            >
              <IoClose size={30} />
            </div>
            <div className="bg-white p-3">
              <img
                src={message.imageUrl}
                alt="uploadImage"
                className="aspect-square w-full h-full max-w-sm m-2 object-scale-down"
              />
            </div>
          </div>
        )}

        {/* VIDEO PREVIEW */}
        {message.videoUrl && (
          <div className="w-full h-full sticky bottom-0 bg-slate-700 bg-opacity-30 flex justify-center items-center rounded overflow-hidden">
            <div
              className="w-fit p-2 absolute top-0 right-0 cursor-pointer hover:text-red-600"
              onClick={handleClearUploadVideo}
            >
              <IoClose size={30} />
            </div>
            <div className="bg-white p-3">
              <video
                src={message.videoUrl}
                className="aspect-square w-full h-full max-w-sm m-2 object-scale-down"
                controls
                muted
                autoPlay
              />
            </div>
          </div>
        )}

        {loading && (
          <div className="flex justify-center items-center">
            <Loading />
          </div>
        )}
      </section>

      {/* SEND MESSAGE */}
      <section className="h-16 bg-white flex items-center px-4">
        <button
          onClick={handleUploadImageVideoOpen}
          className="flex justify-center items-center w-11 h-11 rounded-full hover:bg-primary hover:text-white"
        >
          <FaPlus size={20} />
        </button>

        {openImageVideoUpload && (
          <div className="bg-white shadow rounded absolute bottom-14 w-36 p-2">
            <form>
              <label
                htmlFor="uploadImage"
                className="flex items-center p-2 gap-2 cursor-pointer hover:bg-gray-100"
              >
                <FaImage /> Image
              </label>

              <label
                htmlFor="uploadVideo"
                className="flex items-center p-2 gap-2 cursor-pointer hover:bg-gray-100"
              >
                <FaVideo /> Video
              </label>

              <label
                htmlFor="uploadFiles"
                className="flex items-center p-2 gap-2 cursor-pointer hover:bg-gray-100"
              >
                <FaPaperclip /> Attach File
              </label>

              <input type="file" id="uploadImage" onChange={handleUploadImage} hidden />
              <input type="file" id="uploadVideo" onChange={handleUploadVideo} hidden />
              <input type="file" id="uploadFiles" onChange={handleUploadImage} hidden />
            </form>
          </div>
        )}

        <form className="h-full flex w-full gap-2" onSubmit={handleSendMessage}>
          <div
            ref={editorRef}
            contentEditable
            suppressContentEditableWarning
            data-placeholder="Type something..."
            className="flex-1 min-h-[42px] px-3 py-2 border rounded-xl border-gray-400 focus:outline-none"
          >
            {message.fileName && (
              <span
                contentEditable={false}
                className="inline-flex items-center gap-1 px-2 py-1 mr-1 bg-blue-100 text-blue-700 rounded"
              >
                {message.fileName}
                <button onClick={removeFile} className="text-gray-500 m-[10px] text-[15px] font-bold hover:text-black cursor-pointer">
               X
              </button>
              </span>
            )}
          </div>

          <button className="text-primary hover:text-secondary">
            <IoSend size={28} />
          </button>
        </form>
      </section>
    </div>
  );
};

export default MessagePage;