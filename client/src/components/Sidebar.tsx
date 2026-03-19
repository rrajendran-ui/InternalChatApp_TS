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

  /* SOCKET */
  useEffect(() => {
    if (!socket || !user?._id) return;

    socket.emit("sidebar", user._id);

    const handleConversation = (data: IConversationSummary[]) => {
      setAllUser(data);
    };

    const handleSidebarUpdate = (updatedConv: IConversationSummary) => {
      setAllUser((prev) => {
        const exists = prev.find((c) => c._id === updatedConv._id);

        let updatedList;

        if (exists) {
          // update existing
          updatedList = prev.map((c) =>
            c._id === updatedConv._id ? updatedConv : c
          );
        } else {
          // add new (important fix)
          updatedList = [updatedConv, ...prev];
        }

        // safe sorting
        updatedList.sort((a, b) => {
          const timeA = a.lastMessage?.createdAt
            ? new Date(a.lastMessage.createdAt).getTime()
            : 0;

          const timeB = b.lastMessage?.createdAt
            ? new Date(b.lastMessage.createdAt).getTime()
            : 0;

          return timeB - timeA;
        });

        return updatedList;
      });
    };

    socket.on("conversation", handleConversation);
    socket.on("sidebar-update", handleSidebarUpdate);

    return () => {
      socket.off("conversation", handleConversation);
      socket.off("sidebar-update", handleSidebarUpdate);
    };

  }, [socket, user?._id]);

  /* LOGOUT */
  const handleLogout = () => {
    localStorage.clear();
    dispatch(logout());
    navigate("/"); // matches your router root
  };

  return (
    <div className='w-full h-full grid grid-cols-[48px,1fr] bg-white'>

      {/* LEFT ICON BAR */}
      <div className='bg-slate-100 w-12 h-full rounded-tr-lg rounded-br-lg py-5 text-slate-600 flex flex-col justify-between'>
        
        <div>
          <NavLink
            to=""
            className={({ isActive }) =>
              `w-12 h-12 flex justify-center items-center cursor-pointer hover:bg-slate-200 rounded ${isActive && "bg-slate-200"}`
            }
          >
            <IoChatbubbleEllipses size={20}/>
          </NavLink>

          <div
            onClick={() => setOpenSearchUser(true)}
            className='w-12 h-12 flex justify-center items-center cursor-pointer hover:bg-slate-200 rounded'
          >
            <FaUserPlus size={20}/>
          </div>
        </div>

        <div className='flex flex-col items-center'>
          <button onClick={()=>setEditUserOpen(true)}>
            <Avatar
              width={40}
              height={40}
              name={user?.name}
              imageUrl={user?.profile_pic}
              userId={user?._id}
            />
          </button>

          <button
            onClick={handleLogout}
            className='w-12 h-12 flex justify-center items-center hover:bg-slate-200 rounded'
          >
            <BiLogOut size={20}/>
          </button>
        </div>
      </div>

      {/* RIGHT CONTENT */}
      <div className='w-full'>
        <div className='h-16 flex items-center'>
          <h2 className='text-xl font-bold p-4 text-slate-800'>Chats</h2>
        </div>

        <div className='bg-slate-200 p-[0.5px]'></div>

        <div className='h-[calc(100vh-65px)] overflow-y-auto'>

          {allUser.length === 0 && (
            <div className='mt-12 text-center text-slate-500'>
              <FiArrowUpLeft size={50} className='mx-auto'/>
              <p className='mt-4 text-lg text-slate-400'>
                Explore users to start a conversation.
              </p>
            </div>
          )}

          {allUser.map(conv => (
            <NavLink
              to={`/home/topic/${conv._id}`}
              key={conv._id}
              className='flex items-center gap-2 py-3 px-2 hover:bg-slate-100 rounded'
            >
              <Avatar
                imageUrl={conv.topicImage || ''}
                name={conv.topic}
                userId={user._id}
                width={40}
                height={40}
              />

              <div className='flex-1'>
                <h3 className='line-clamp-1 font-semibold'>
                  {conv.topic}
                </h3>

                <div className='text-slate-500 text-xs flex items-center gap-1'>

                  {/* MEDIA ICONS */}
                  {conv.lastMessage?.imageUrl && <FaImage />}
                  {conv.lastMessage?.videoUrl && <FaVideo />}

                  {/* TEXT */}
                  <p className='line-clamp-1 w-[110px]'>
                    {conv.lastMessage?.text ||
                     conv.lastMessage?.fileName ||
                     "No messages"}
                  </p>

                  {/* TIME */}
                  <p className='ml-auto text-xs w-[60px] text-right'>
                    {conv.lastMessage?.createdAt
                      ? moment(conv.lastMessage.createdAt).format('hh:mm A')
                      : ""}
                  </p>
                </div>
              </div>

              {/* UNSEEN */}
              {conv.unseenMsg > 0 && (
                <p className='text-xs w-6 h-6 flex justify-center items-center bg-primary text-white rounded-full'>
                  {conv.unseenMsg}
                </p>
              )}
            </NavLink>
          ))}
        </div>
      </div>

      {/* MODALS */}
      {editUserOpen && (
        <EditUserDetails onClose={()=>setEditUserOpen(false)} user={user}/>
      )}

      {openSearchUser && (
        <SearchUser onClose={()=>setOpenSearchUser(false)} currentUser={user}/>
      )}
    </div>
  );
};

export default Sidebar;