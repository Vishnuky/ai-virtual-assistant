import React, { useContext, useState } from 'react'
import bg from "../assets/authBg.png"
import { IoEye, IoEyeOff } from "react-icons/io5";
import { useNavigate } from 'react-router-dom';
import { userDataContext } from '../context/UserContext';
import axios from "axios"

function SignIn() {
  const [showPassword, setShowPassword] = useState(false)
  const { serverUrl, setUserData } = useContext(userDataContext)
  const navigate = useNavigate()

  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [err, setErr] = useState("")

  const handleSignIn = async (e) => {
    e.preventDefault()
    setErr("")
    setLoading(true)

    try {
      const result = await axios.post(
        `${serverUrl}/api/auth/signin`,
        { email, password },
        { withCredentials: true }
      )

      console.log("SIGNIN SUCCESS:", result.data)

      setUserData(result.data.user || result.data)
      navigate("/")

    } catch (error) {
      console.log("SIGNIN ERROR:", error)

      const message =
        error.response?.data?.message ||
        error.response?.data ||
        error.message ||
        "Signin failed"

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
        onSubmit={handleSignIn}
      >

        <h1 className='text-white text-[30px] font-semibold mb-[30px]'>
          Sign In to <span className='text-blue-400'>Virtual Assistant</span>
        </h1>

        <input
          type="email"
          placeholder='Email'
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className='w-full h-[60px] border-2 border-white bg-transparent text-white px-[20px] rounded-full'
        />

        <div className='w-full h-[60px] border-2 border-white rounded-full relative'>
          <input
            type={showPassword ? "text" : "password"}
            placeholder='Password'
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className='w-full h-full bg-transparent text-white px-[20px] rounded-full'
          />

          {showPassword
            ? <IoEyeOff className='absolute top-[18px] right-[20px] cursor-pointer' onClick={() => setShowPassword(false)} />
            : <IoEye className='absolute top-[18px] right-[20px] cursor-pointer' onClick={() => setShowPassword(true)} />
          }
        </div>

        {err && <p className='text-red-500'>*{err}</p>}

        <button disabled={loading} className='h-[60px] bg-white rounded-full'>
          {loading ? "Loading..." : "Sign In"}
        </button>

        <p className='text-white cursor-pointer' onClick={() => navigate("/signup")}>
          Create account? <span className='text-blue-400'>Sign Up</span>
        </p>

      </form>
    </div>
  )
}

export default SignIn
