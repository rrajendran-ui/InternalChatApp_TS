import { createSlice } from '@reduxjs/toolkit'


interface UserState {
  _id: string
  name: string
  email: string
  profile_pic: string
  token: string
  onlineUser: string[]
}

const storedToken = localStorage.getItem("token");

const initialState: UserState = {
  _id: "",
  name: "",
  email: "",
  profile_pic: "",
  token: storedToken || "",
  onlineUser: [],
};

export const userSlice = createSlice({
  name: 'user',
  initialState,
  reducers: {
    setUser : (state,action)=>{
        state._id = action.payload._id
        state.name = action.payload.name 
        state.email = action.payload.email 
        state.profile_pic = action.payload.profile_pic 
    },
    setToken : (state, action)=>{
        state.token = action.payload
    },
    logout : (state)=>{
        state._id = ""
        state.name = ""
        state.email = ""
        state.profile_pic = ""
        state.token = ""
        state.onlineUser = []
        localStorage.removeItem("user")
        //state.socketConnection = null
    },
    setOnlineUser : (state,action)=>{
      state.onlineUser = action.payload
    },
    // setSocketConnection : (state, action: { payload: Socket | null })=>{
    //   state.socketConnection = action.payload as any
    // }
  },
})

// Action creators are generated for each case reducer function
export const { setUser, setToken ,logout, setOnlineUser } = userSlice.actions

export default userSlice.reducer