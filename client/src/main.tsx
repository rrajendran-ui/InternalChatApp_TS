import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import { Provider } from 'react-redux'
import { store } from './redux/store'
import { RouterProvider } from 'react-router-dom'
import { SocketProvider } from "./context/SocketContext";
import router from './routes/index'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Provider store={store}>
      <SocketProvider>
        <RouterProvider router={router} />
      </SocketProvider>
    </Provider>
  </StrictMode>,
)
