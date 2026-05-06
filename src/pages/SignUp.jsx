import React, { useContext, useState } from 'react'
import bg from "../assets/authBg.png"
import { IoEye, IoEyeOff } from "react-icons/io5"
import { useNavigate } from 'react-router-dom'
import { userDataContext } from '../context/UserContext'
import axios from "axios"

function SignUp() {
  const [showPassword, setShowPassword] = useState(false)
  const { setUserData } = useContext(userDataContext)
  const navigate = useNavigate()
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [err, setErr] = useState("")

  const handleSignUp = async (e) => {
    e.preventDefault()
    setErr("")
    setLoading(true)
    try {
      const result = await axios.post("/api/auth/signup", { name, email, password })
      const { token, user } = result.data
      localStorage.setItem("token", token)
      axios.defaults.headers.common["Authorization"] = `Bearer ${token}`
      setUserData(user)
      navigate("/customize")
    } catch (error) {
      const message = error.response?.data?.message || error.message || "Signup failed"
      setErr(message)
      setUserData(null)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className='w-full h-[100vh] bg-cover flex justify-center items-center'
      style={{ backgroundImage: `url(${bg})` }}>
      <form
        className='w-[90%] h-[600px] max-w-[500px] bg-[#00000062] backdrop-blur shadow-lg shadow-black flex flex-col items-center justify-center gap-[20px] px-[20px]'
        onSubmit={handleSignUp}
      >
        <h1 className='text-white text-[30px] font-semibold mb-[30px]'>
          Register to <span className='text-blue-400'>Virtual Assistant</span>
        </h1>
        <input
          type="text"
          placeholder='Enter your Name'
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
          className='w-full h-[60px] border-2 border-white bg-transparent text-white px-[20px] rounded-full outline-none'
        />
        <input
          type="email"
          placeholder='Email'
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className='w-full h-[60px] border-2 border-white bg-transparent text-white px-[20px] rounded-full outline-none'
        />
        <div className='w-full h-[60px] border-2 border-white rounded-full relative'>
          <input
            type={showPassword ? "text" : "password"}
            placeholder='Password'
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className='w-full h-full bg-transparent text-white px-[20px] rounded-full outline-none'
          />
          {showPassword
            ? <IoEyeOff className='absolute top-[18px] right-[20px] cursor-pointer text-white' onClick={() => setShowPassword(false)} />
            : <IoEye className='absolute top-[18px] right-[20px] cursor-pointer text-white' onClick={() => setShowPassword(true)} />
          }
        </div>
        {err && <p className='text-red-500'>*{err}</p>}
        <button disabled={loading} className='w-full h-[60px] bg-white rounded-full font-semibold text-[18px]'>
          {loading ? "Loading..." : "Sign Up"}
        </button>
        <p className='text-white cursor-pointer' onClick={() => navigate("/signin")}>
          Already have an account? <span className='text-blue-400'>Sign In</span>
        </p>
      </form>
    </div>
  )
}

export default SignUp
