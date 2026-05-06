import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { BrowserRouter } from "react-router-dom"
import UserContext from './context/UserContext.jsx'
import axios from "axios"

axios.defaults.baseURL = "https://ai-virtual-assistant-backend-1.onrender.com"

const token = localStorage.getItem("token")
if (token) {
  axios.defaults.headers.common["Authorization"] = `Bearer ${token}`
}

createRoot(document.getElementById('root')).render(
  <BrowserRouter>
    <UserContext>
      <App />
    </UserContext>
  </BrowserRouter>
)
