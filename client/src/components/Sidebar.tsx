import { useEffect, useState } from 'react';
import { IoChatbubbleEllipses } from "react-icons/io5";
import { FaUserPlus, FaImage, FaVideo } from "react-icons/fa6";
import { NavLink, useNavigate } from 'react-router-dom';
import { BiLogOut } from "react-icons/bi"; 
import moment from 'moment'; 
import { useAppDispatch, useAppSelector } from '../redux/hooks'
import Avatar from './Avatar';
import EditUserDetails from './EditUserDetails';
import { FiArrowUpLeft } from "react-icons/fi";
import SearchUser from './SearchUser'; 
import { logout } from '../redux/userSlice';
import type { IConversationSummary } from "../redux/types";
import { useSocket } from "../context/SocketContext";
const Sidebar = () => {
  const user = useAppSelector((state) => state.user);
  const { socket } = useSocket();
  const dispatch = useAppDispatch();
  const navigate = useNavigate();

  const [allUser, setAllUser] = useState<IConversationSummary[]>([]);
  const [editUserOpen, setEditUserOpen] = useState(false);
  const [openSearchUser, setOpenSearchUser] = useState(false);

  // Listen to conversations from socket
  useEffect(() => {
     console.log("Emitting sidebar event with socket:", socket);
  if (!socket || !user?._id) return;
    console.log("Emitting sidebar event with user ID:", user._id);
  socket.emit("sidebar", user._id);

  const handleConversation = (data: IConversationSummary[]) => {
    if (!Array.isArray(data)) return;
    setAllUser(data);
  };

  socket.on("conversation", handleConversation);

  return () => {
    socket.off("conversation", handleConversation);
  };

}, [socket, user?._id]);

  const handleLogout = () => {
    dispatch(logout());
    navigate("/email");
    localStorage.clear();
  };

  return (
    <div className='w-full h-full grid grid-cols-[48px,1fr] bg-white'>
      
      {/* Sidebar icons */}
      <div className='bg-slate-100 w-12 h-full rounded-tr-lg rounded-br-lg py-5 text-slate-600 flex flex-col justify-between'>
        <div>
          <NavLink
            className={({ isActive }) => `w-12 h-12 flex justify-center items-center cursor-pointer hover:bg-slate-200 rounded ${isActive && "bg-slate-200"}`}
            title='chat' to={''}          >
            <IoChatbubbleEllipses size={20}/>
          </NavLink>
          <div
            title='add friend'
            onClick={() => setOpenSearchUser(true)}
            className='w-12 h-12 flex justify-center items-center cursor-pointer hover:bg-slate-200 rounded'
          >
            <FaUserPlus size={20}/>
          </div>
        </div>

        <div className='flex flex-col items-center'>
          <button className='mx-auto' title={user?.name} onClick={()=>setEditUserOpen(true)}>
            <Avatar
              width={40}
              height={40}
              name={user?.name}
              imageUrl={user?.profile_pic}
              userId={user?._id}
            />
          </button>
          <button
            title='logout'
            className='w-12 h-12 flex justify-center items-center cursor-pointer hover:bg-slate-200 rounded'
            onClick={handleLogout}
          >
            <BiLogOut size={20}/>
          </button>
        </div>
      </div>

      {/* Sidebar content */}
      <div className='w-full'>
        <div className='h-16 flex items-center'>
          <h2 className='text-xl font-bold p-4 text-slate-800'>Chats</h2>
        </div>
        <div className='bg-slate-200 p-[0.5px]'></div>

        <div className='h-[calc(100vh-65px)] overflow-y-auto scrollbar'>
          {allUser.length === 0 && (
            <div className='mt-12 text-center text-slate-500'>
              <FiArrowUpLeft size={50} className='mx-auto'/>
              <p className='mt-4 text-lg text-slate-400'>Explore users to start a conversation.</p>
            </div>
          )}

          {allUser.map(conv => (
            <NavLink
              to={`/topic/${conv._id}`}
              key={conv._id}
              className='flex items-center gap-2 py-3 px-2 border border-transparent hover:border-primary rounded hover:bg-slate-100 cursor-pointer'
            >
              <Avatar
                imageUrl={conv.topicImage || ''}
                name={conv.topic}
                userId={user._id}
                width={40}
                height={40}
              />

              <div className='flex-1'>
                <h3 className='text-ellipsis line-clamp-1 font-semibold text-base'>{conv.topic}</h3>
                <div className='text-slate-500 text-xs flex items-center gap-1'>
                  <div className='flex items-center gap-1'>
                    {conv.lastMessage?.imageUrl && (
                      <div className='flex items-center gap-1'>
                        <FaImage/>
                        {!conv.lastMessage.text && <span>Image</span>}
                      </div>
                    )}
                    {conv.lastMessage?.videoUrl && (
                      <div className='flex items-center gap-1'>
                        <FaVideo/>
                        {!conv.lastMessage.text && <span>Video</span>}
                      </div>
                    )}
                  </div>
                  <p className='text-ellipsis line-clamp-1 w-[105px]'>
                    {conv.lastMessage?.text || conv.lastMessage?.fileName || "No messages yet"}
                  </p>
                  <p className='text-xs ml-auto w-[60px] text-right'>
                    {conv.lastMessage?.createdAt && moment(conv.lastMessage.createdAt).format('hh:mm A')}
                  </p>
                </div>
              </div>

              {conv.unseenMsg > 0 && (
                <p className='text-xs w-6 h-6 flex justify-center items-center ml-auto p-1 bg-primary text-white font-semibold rounded-full'>
                  {conv.unseenMsg}
                </p>
              )}
            </NavLink>
          ))}
        </div>
      </div>

            {/* Edit user */}
            {editUserOpen && <EditUserDetails onClose={()=>setEditUserOpen(false)} user={user}/>}

            {/* Search/create group */}
            {openSearchUser && <SearchUser onClose={()=>setOpenSearchUser(false)} currentUser={user}/>}
        </div>
    );
};

export default Sidebar;