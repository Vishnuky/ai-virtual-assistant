import React, {
  useContext,
  useEffect,
  useRef,
  useState,
  useCallback,
} from 'react'
import { userDataContext } from '../context/UserContext'
import { useNavigate } from 'react-router-dom'
import axios from 'axios'
import aiImg from '../assets/ai.gif'
import userImg from '../assets/user.gif'
import { CgMenuRight } from 'react-icons/cg'
import { RxCross1 } from 'react-icons/rx'
import { AiOutlineSend } from 'react-icons/ai'
import { BsMicFill, BsMicMuteFill } from 'react-icons/bs'
import { MdLogout, MdTune } from 'react-icons/md'

function Home() {
  const { userData, setUserData, getGeminiResponse } = useContext(userDataContext)

  const navigate = useNavigate()

  const [listening, setListening] = useState(false)
  const [aiText, setAiText] = useState('')
  const [userText, setUserText] = useState('')
  const [inputText, setInputText] = useState('')
  const [ham, setHam] = useState(false)
  const [micEnabled, setMicEnabled] = useState(true)

  const recognitionRef = useRef(null)
  const isProcessingRef = useRef(false)
  const synth = window.speechSynthesis

  /* ---------------- LOGOUT ---------------- */
  const handleLogOut = async () => {
    try {
      await axios.get("/api/auth/logout")
    } catch {}
    localStorage.removeItem("token")
    delete axios.defaults.headers.common["Authorization"]
    setUserData(null)
    navigate('/signin')
  }

  /* ---------------- SPEAK ---------------- */
  const speak = useCallback(text => {
    if (!text) return
    synth.cancel()
    const utter = new SpeechSynthesisUtterance(text)
    utter.lang = 'en-IN'
    synth.speak(utter)
  }, [])

  /* ---------------- COMMAND EXECUTION ---------------- */
  const handleCommand = (data) => {
    if (!data) return

    const { type, userInput, response } = data
    const query = encodeURIComponent(userInput || '')

    console.log("⚡ Executing:", type)

    if (response) speak(response)

    setTimeout(() => {
      switch (type) {
        case 'youtube-play':
        case 'youtube-search':
          window.open(`https://www.youtube.com/results?search_query=${query}`, '_blank')
          break

        case 'facebook-open':
          window.open(`https://www.facebook.com/`, '_blank')
          break

        case 'google-search':
          window.open(`https://www.google.com/search?q=${query}`, '_blank')
          break

        default:
          if (userInput) {
            window.open(`https://www.google.com/search?q=${query}`, '_blank')
          }
          break
      }
    }, 700)
  }

  /* ---------------- PROCESS COMMAND ---------------- */
  const processCommand = async text => {
    if (!text || isProcessingRef.current) return

    isProcessingRef.current = true
    console.log('🚀 Processing:', text)

    try {
      let data = await getGeminiResponse(text)

      console.log('🧠 AI:', data)

      const lower = text.toLowerCase()

      if (lower.includes('youtube')) {
        data.type = 'youtube-play'
        data.userInput = 'youtube'
      }

      if (lower.includes('facebook')) {
        data.type = 'facebook-open'
        data.userInput = 'facebook'
      }

      if (lower.includes('google')) {
        data.type = 'google-search'
        data.userInput = text
      }

      setAiText(data?.response || '')
      handleCommand(data)
    } catch (err) {
      console.error(err)
    }

    setTimeout(() => {
      isProcessingRef.current = false
    }, 1000)
  }

  /* ---------------- MIC CONTROL ---------------- */
  const toggleMic = () => {
    const state = !micEnabled
    setMicEnabled(state)

    if (state) {
      startListening()
    } else {
      recognitionRef.current?.stop()
    }
  }

  const startListening = () => {
    if (!recognitionRef.current || !micEnabled) return
    try {
      recognitionRef.current.start()
    } catch {}
  }

  /* ---------------- SPEECH SETUP ---------------- */
  useEffect(() => {
    if (!userData) return

    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition

    if (!SpeechRecognition) return

    const recognition = new SpeechRecognition()
    recognition.continuous = true
    recognition.lang = 'en-IN'
    recognition.interimResults = false

    recognitionRef.current = recognition

    recognition.onstart = () => {
      console.log('🎙️ Mic started')
      setListening(true)
    }

    recognition.onend = () => {
      setListening(false)
      if (micEnabled && !isProcessingRef.current) {
        setTimeout(() => {
          startListening()
        }, 600)
      }
    }

    recognition.onerror = () => {
      setListening(false)
      if (micEnabled) startListening()
    }

    recognition.onresult = e => {
      const transcript = e.results[e.results.length - 1][0].transcript.trim()
      console.log('🎤 Heard:', transcript)

      const wake = userData.assistantName.toLowerCase()
      const lower = transcript.toLowerCase()

      if (lower.startsWith(wake)) {
        const clean = transcript.slice(wake.length).trim()
        console.log('🧠 Command:', clean)
        if (clean) processCommand(clean)
      }
    }

    setTimeout(() => {
      speak(`Hello ${userData.name}`)
    }, 500)

    startListening()

    return () => {
      recognition.stop()
      synth.cancel()
    }
  }, [userData])

  /* ---------------- UI ---------------- */
  return (
    <div className="w-full h-screen bg-gradient-to-t from-black to-[#02023d] flex flex-col">
      {/* TOP BAR */}
      <div className="flex justify-between p-4 text-white">
        <h2>🤖 {userData?.assistantName}</h2>
        <CgMenuRight onClick={() => setHam(true)} className="cursor-pointer" />
      </div>

      {/* MENU */}
      {ham && (
        <div className="absolute inset-0 bg-black/80 p-6 flex flex-col gap-4">
          <RxCross1 onClick={() => setHam(false)} className="text-white" />
          <button
            onClick={() => navigate('/customize')}
            className="text-white flex gap-2"
          >
            <MdTune /> Customize
          </button>
          <button onClick={handleLogOut} className="text-red-400 flex gap-2">
            <MdLogout /> Logout
          </button>
        </div>
      )}

      {/* MAIN */}
      <div className="flex-1 flex flex-col items-center justify-center text-white">
        <img
          src={userData?.assistantImage}
          className="w-[200px] h-[250px] rounded-xl object-cover"
        />

        <p className="mt-2">
          {micEnabled
            ? listening
              ? '🎙️ Listening...'
              : '⏳ Restarting...'
            : '🔇 Mic Off'}
        </p>

        <img src={aiText ? aiImg : userImg} className="w-[120px]" />

        <p className="text-center px-4">{userText || aiText}</p>

        {/* INPUT + MIC */}
        <div className="flex gap-2 mt-4 bg-white rounded-full px-4 py-2 w-[90%] max-w-[500px] items-center shadow-lg">
          <input
            value={inputText}
            onChange={e => setInputText(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && processCommand(inputText)}
            placeholder="Ask something..."
            className="flex-1 bg-transparent outline-none text-black"
          />
          <button onClick={() => processCommand(inputText)}>
            <AiOutlineSend size={20} />
          </button>
          <button
            onClick={toggleMic}
            className={`p-2 rounded-full ${
              micEnabled ? 'bg-blue-500 text-white' : 'bg-red-500 text-white'
            }`}
          >
            {micEnabled ? <BsMicFill /> : <BsMicMuteFill />}
          </button>
        </div>
      </div>
    </div>
  )
}

export default Home
