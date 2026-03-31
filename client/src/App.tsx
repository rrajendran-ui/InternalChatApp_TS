import './App.css';
import { Toaster } from 'react-hot-toast';
import { Outlet } from 'react-router-dom';
import { useEffect} from "react";
import { useDispatch } from "react-redux";
import { setAllUsers } from "./redux/userSlice"; 

import axios from 'axios';
function App() {
  const dispatch = useDispatch(); 
  useEffect(() => {
  const fetchUsers = async () => {
    try {
      const res = await axios.post(
        `${import.meta.env.VITE_API_URL}/api/search-user`,
        { search: "" }
      );

      dispatch(setAllUsers(res.data.data));
    } catch (err: any) {
      //toast.error("Failed to load users");
    }
  };

  fetchUsers();
}, []);
  return (
    <>
    <Toaster/>
    <main>
      <Outlet/>
    </main>
    </>
  )
}

export default App
