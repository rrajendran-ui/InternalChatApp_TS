import axios from 'axios'
import { useEffect } from 'react'
import { useDispatch } from 'react-redux'
import { Outlet, useLocation, useNavigate } from 'react-router-dom'
import { logout, setOnlineUser, setUser } from '../redux/userSlice'
import { useAppSelector } from '../redux/hooks'
import Sidebar from '../components/Sidebar'
import logo from '../assets/logo.png'
//import io from 'socket.io-client'
import { useSocket } from "../context/SocketContext";


const Home = () => {
  const user = useAppSelector(state => state.user)
  const { socket } = useSocket();
  const dispatch = useDispatch()
  const navigate = useNavigate()
  const location = useLocation()

  console.log('user',user)
  const fetchUserDetails = async () => {
  try {
    const URL = `${import.meta.env.VITE_API_URL}/api/user-details`

    const response = await axios({
      url: URL,
      withCredentials: true
    })
console.log('response',response?.data?.data)
    const userData = response?.data?.data

    if (!userData) {
      dispatch(logout())
      navigate("/email")
      return
    }

    dispatch(setUser(userData)) 

    //dispatch(setToken(userData.token))
    localStorage.setItem("user", JSON.stringify(userData))
  } catch (error) {
    dispatch(logout())
    navigate("/email")
  }
}

  useEffect(()=>{
    fetchUserDetails()
  },[])

  /***socket connection */
  useEffect(() => {
    console.log("Home component - useEffect for socket connection. Socket:", socket);
  if (!socket) return

  const handleOnlineUsers = (data: string[]) => {
    dispatch(setOnlineUser(data))
  }

  socket.on('onlineUser', handleOnlineUsers)

  return () => {
    socket.off('onlineUser', handleOnlineUsers)
  }
}, [socket])


  const basePath = location.pathname === '/'
  return (
    <div className='grid lg:grid-cols-[300px,1fr] h-screen max-h-screen'>
        <section className={`bg-white ${!basePath && "hidden"} lg:block`}>
           <Sidebar/>
        </section>

        {/**message component**/}
        <section className={`${basePath && "hidden"}`} >
            <Outlet/>
        </section>


        <div className={`justify-center items-center flex-col gap-2 hidden ${!basePath ? "hidden" : "lg:flex" }`}>
            <div>
              <img
                src={logo}
                width={250}
                alt='logo'
              />
            </div>
            <p className='text-lg mt-2 text-slate-500'>Select user to send message</p>
        </div>
    </div>
  )
}

export default Home
