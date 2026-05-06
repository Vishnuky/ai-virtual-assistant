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
  const micEnabledRef = useRef(true)
  const isListeningRef = useRef(false)
  const restartTimerRef = useRef(null)   // ✅ tracks pending restart so we never double-schedule
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

  /* ---------------- SAFE RESTART ---------------- */
  const scheduleRestart = useCallback(() => {
    // ✅ Cancel any pending restart before scheduling a new one
    if (restartTimerRef.current) {
      clearTimeout(restartTimerRef.current)
      restartTimerRef.current = null
    }

    restartTimerRef.current = setTimeout(() => {
      restartTimerRef.current = null

      // ✅ Only start if all conditions are met
      if (
        !micEnabledRef.current ||
        isListeningRef.current ||
        isProcessingRef.current ||
        !recognitionRef.current
      ) return

      try {
        recognitionRef.current.start()
      } catch (e) {
        console.log("Restart error:", e.message)
      }
    }, 500)
  }, [])

  /* ---------------- COMMAND EXECUTION ---------------- */
  const handleCommand = useCallback((data) => {
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
        case 'instagram-open':
          window.open(`https://www.instagram.com/`, '_blank')
          break
        case 'google-search':
          window.open(`https://www.google.com/search?q=${query}`, '_blank')
          break
        case 'weather-show':
          window.open(`https://www.google.com/search?q=weather+today`, '_blank')
          break
        case 'calculator-open':
          window.open(`https://www.google.com/search?q=calculator`, '_blank')
          break
        case 'get-date':
        case 'get-time':
        case 'get-day':
        case 'get-month':
        case 'general':
          break
        default:
          if (userInput) {
            window.open(`https://www.google.com/search?q=${query}`, '_blank')
          }
          break
      }
    }, 700)
  }, [speak])

  /* ---------------- PROCESS COMMAND ---------------- */
  const processCommand = useCallback(async (text) => {
    if (!text?.trim() || isProcessingRef.current) return

    isProcessingRef.current = true
    setUserText(text)
    setAiText('')
    console.log('🚀 Processing:', text)

    try {
      let data = await getGeminiResponse(text)
      console.log('🧠 AI:', data)

      if (!data) {
        speak("Sorry, I could not understand that")
        return
      }

      const lower = text.toLowerCase()

      if (lower.includes('youtube')) {
        data.type = 'youtube-search'
        data.userInput = text.replace(/youtube/gi, '').trim() || 'youtube'
        data.response = data.response || 'Opening YouTube'
      }
      if (lower.includes('facebook')) {
        data.type = 'facebook-open'
        data.response = data.response || 'Opening Facebook'
      }
      if (lower.includes('instagram')) {
        data.type = 'instagram-open'
        data.response = data.response || 'Opening Instagram'
      }
      if (lower.includes('spotify')) {
        data.type = 'general'
        data.response = 'Opening Spotify'
        speak('Opening Spotify')
        setTimeout(() => window.open('https://open.spotify.com', '_blank'), 700)
      }
      if (lower.includes('google') && !lower.includes('youtube')) {
        data.type = 'google-search'
        data.userInput = text
        data.response = data.response || 'Searching Google'
      }

      setAiText(data?.response || '')
      handleCommand(data)

    } catch (err) {
      console.error(err)
      speak("Something went wrong")
    } finally {
      // ✅ Release processing lock after 3 seconds
      setTimeout(() => {
        isProcessingRef.current = false
      }, 3000)
    }
  }, [getGeminiResponse, handleCommand, speak])

  /* ---------------- SPEECH SETUP ---------------- */
  useEffect(() => {
    if (!userData) return

    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition

    if (!SpeechRecognition) {
      alert("Speech recognition not supported in this browser")
      return
    }

    const recognition = new SpeechRecognition()
    recognition.continuous = false       // ✅ false = stops after each result, we restart manually
    recognition.lang = 'en-IN'
    recognition.interimResults = false
    recognition.maxAlternatives = 1

    recognitionRef.current = recognition

    recognition.onstart = () => {
      console.log('🎙️ Mic started')
      isListeningRef.current = true
      setListening(true)
    }

    recognition.onend = () => {
      console.log('🎙️ Mic ended')
      isListeningRef.current = false
      setListening(false)
      // ✅ Always go through scheduleRestart — never restart directly
      if (micEnabledRef.current) scheduleRestart()
    }

    recognition.onerror = (e) => {
      console.log('🎙️ Mic error:', e.error)
      isListeningRef.current = false
      setListening(false)

      // ✅ Don't restart on these errors
      if (e.error === 'not-allowed' || e.error === 'service-not-allowed') {
        micEnabledRef.current = false
        setMicEnabled(false)
        return
      }

      // ✅ For all other errors, let onend handle restart via scheduleRestart
      // Do NOT call scheduleRestart here — onend fires after onerror automatically
    }

    recognition.onresult = (e) => {
      const transcript = e.results[e.results.length - 1][0].transcript.trim()
      console.log('🎤 Heard:', transcript)

      const wake = userData.assistantName.toLowerCase()
      const lower = transcript.toLowerCase()

      if (lower.includes(wake)) {
        const clean = lower.replace(wake, '').trim()
        console.log('🧠 Command:', clean)
        if (clean) processCommand(clean)
      }
    }

    // Greeting
    setTimeout(() => {
      speak(`Hello ${userData.name}, I am ${userData.assistantName}. How can I help you?`)
    }, 500)

    // Start mic after greeting delay
    setTimeout(() => {
      if (micEnabledRef.current) {
        try {
          recognition.start()
        } catch (e) {
          console.log(e.message)
        }
      }
    }, 1000)

    return () => {
      if (restartTimerRef.current) clearTimeout(restartTimerRef.current)
      recognition.abort()
      synth.cancel()
    }
  }, [userData])

  /* ---------------- TOGGLE MIC ---------------- */
  const toggleMic = useCallback(() => {
    const newState = !micEnabledRef.current
    micEnabledRef.current = newState
    setMicEnabled(newState)

    if (newState) {
      scheduleRestart()
    } else {
      if (restartTimerRef.current) {
        clearTimeout(restartTimerRef.current)
        restartTimerRef.current = null
      }
      recognitionRef.current?.abort()
    }
  }, [scheduleRestart])

  /* ---------------- UI ---------------- */
  return (
    <div className="w-full h-screen bg-gradient-to-t from-black to-[#02023d] flex flex-col">
      {/* TOP BAR */}
      <div className="flex justify-between p-4 text-white">
        <h2>🤖 {userData?.assistantName}</h2>
        <CgMenuRight onClick={() => setHam(true)} className="cursor-pointer w-6 h-6" />
      </div>

      {/* MENU */}
      {ham && (
        <div className="absolute inset-0 bg-black/80 p-6 flex flex-col gap-6 z-50">
          <RxCross1
            onClick={() => setHam(false)}
            className="text-white w-6 h-6 cursor-pointer"
          />
          <button
            onClick={() => { setHam(false); navigate('/customize') }}
            className="text-white flex gap-2 items-center text-lg"
          >
            <MdTune /> Customize
          </button>
          <button
            onClick={handleLogOut}
            className="text-red-400 flex gap-2 items-center text-lg"
          >
            <MdLogout /> Logout
          </button>
        </div>
      )}

      {/* MAIN */}
      <div className="flex-1 flex flex-col items-center justify-center text-white gap-3">
        <img
          src={userData?.assistantImage}
          className="w-[200px] h-[250px] rounded-xl object-cover"
          alt="assistant"
        />

        <p className="mt-2 text-sm">
          {micEnabled
            ? listening
              ? '🎙️ Listening...'
              : '⏳ Ready...'
            : '🔇 Mic Off'}
        </p>

        <img
          src={aiText ? aiImg : userImg}
          className="w-[80px]"
          alt="status"
        />

        {userText && (
          <p className="text-gray-300 text-sm px-4 text-center">You: {userText}</p>
        )}
        {aiText && (
          <p className="text-center px-4 text-white">{aiText}</p>
        )}

        {/* INPUT + MIC */}
        <div className="flex gap-2 mt-4 bg-white rounded-full px-4 py-2 w-[90%] max-w-[500px] items-center shadow-lg">
          <input
            value={inputText}
            onChange={e => setInputText(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter' && inputText.trim()) {
                processCommand(inputText.trim())
                setInputText('')
              }
            }}
            placeholder="Ask something..."
            className="flex-1 bg-transparent outline-none text-black"
          />
          <button
            onClick={() => {
              if (inputText.trim()) {
                processCommand(inputText.trim())
                setInputText('')
              }
            }}
          >
            <AiOutlineSend size={20} className="text-black" />
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
