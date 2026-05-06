import axios from 'axios'
import React, { createContext, useEffect, useState } from 'react'

export const userDataContext = createContext()

function UserContext({ children }) {
  const [userData, setUserData] = useState(null)
  const [frontendImage, setFrontendImage] = useState(null)
  const [backendImage, setBackendImage] = useState(null)
  const [selectedImage, setSelectedImage] = useState(null)

  const handleCurrentUser = async () => {
    try {
      const token = localStorage.getItem("token")
      if (!token) return

      const result = await axios.get("/api/user/current")
      setUserData(result.data)
      console.log(result.data)
    } catch (error) {
      console.log(error)
    }
  }

  const getGeminiResponse = async (command) => {
    try {
      const result = await axios.post("/api/user/asktoassistant", { command })
      console.log('Gemini result:', result.data)
      return result.data
    } catch (error) {
      console.log('Status:', error.response?.status)
      console.log('Message:', error.response?.data)
      console.log('Full error:', error.message)
    }
  }

  useEffect(() => {
    handleCurrentUser()
  }, [])

  const value = {
    userData,
    setUserData,
    backendImage,
    setBackendImage,
    frontendImage,
    setFrontendImage,
    selectedImage,
    setSelectedImage,
    getGeminiResponse,
  }

  return (
    <userDataContext.Provider value={value}>
      {children}
    </userDataContext.Provider>
  )
}

export default UserContext
