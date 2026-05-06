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
  const [status, setStatus] = useState('⏳ Ready...')

  const recognitionRef = useRef(null)
  const restartTimerRef = useRef(null)
  const isListeningRef = useRef(false)
  const isProcessingRef = useRef(false)
  const micEnabledRef = useRef(true)

  const commandQueueRef = useRef([])
  const isQueueRunningRef = useRef(false)

  const synth = window.speechSynthesis

  /* ---------------- SAFE START ---------------- */
  const safeStart = () => {
    if (
      !recognitionRef.current ||
      isListeningRef.current ||
      isProcessingRef.current ||
      !micEnabledRef.current
    ) return

    try {
      recognitionRef.current.start()
    } catch {}
  }

  const scheduleRestart = useCallback(() => {
    if (restartTimerRef.current) clearTimeout(restartTimerRef.current)
    restartTimerRef.current = setTimeout(() => {
      safeStart()
    }, 800)
  }, [])

  /* ---------------- SPEAK ---------------- */
  const speak = useCallback((text) => {
    return new Promise((resolve) => {
      if (!text) return resolve()
      synth.cancel()
      const utter = new SpeechSynthesisUtterance(text)
      utter.lang = 'en-IN'
      utter.onend = resolve
      utter.onerror = resolve
      synth.speak(utter)
    })
  }, [])

  /* ---------------- COMMAND ---------------- */
  const executeAction = useCallback(async (data, text) => {
    const response = data?.response || 'Here is what I found'
    setAiText(response)
    await speak(response)
  }, [speak])

  const processQueue = useCallback(async () => {
    if (isQueueRunningRef.current) return
    isQueueRunningRef.current = true

    while (commandQueueRef.current.length > 0) {
      const text = commandQueueRef.current.shift()

      isProcessingRef.current = true
      setUserText(text)
      setAiText('')
      setStatus('🤔 Thinking...')

      try {
        const data = await getGeminiResponse(text)
        await executeAction(data, text)
      } catch {
        await speak('Something went wrong')
      }

      isProcessingRef.current = false
      setStatus('⏳ Ready...')
    }

    isQueueRunningRef.current = false
    scheduleRestart()
  }, [executeAction, getGeminiResponse, speak, scheduleRestart])

  const addCommand = (text) => {
    if (!text || !text.trim()) return
    commandQueueRef.current.push(text.trim())
    processQueue()
  }

  /* ---------------- MIC SETUP ---------------- */
  useEffect(() => {
    if (!userData) return

    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition

    if (!SpeechRecognition) return

    const recognition = new SpeechRecognition()
    recognition.continuous = false
    recognition.lang = 'en-IN'
    recognitionRef.current = recognition

    recognition.onstart = () => {
      isListeningRef.current = true
      setListening(true)
      setStatus('🎙️ Listening...')
    }

    recognition.onend = () => {
      isListeningRef.current = false
      setListening(false)
      if (!micEnabledRef.current || isProcessingRef.current) return
      scheduleRestart()
    }

    recognition.onerror = (e) => {
      if (e.error === 'aborted') return
      if (e.error === 'not-allowed') {
        micEnabledRef.current = false
        setMicEnabled(false)
        setStatus('🔇 Mic blocked')
        return
      }
      scheduleRestart()
    }

    recognition.onresult = (e) => {
      const transcript = e.results[0][0].transcript.toLowerCase().trim()
      const wake = userData.assistantName?.toLowerCase() || 'assistant'

      if (transcript.includes(wake)) {
        const cmd = transcript.replace(wake, '').trim()
        if (cmd) addCommand(cmd)
      }
    }

    setTimeout(async () => {
      await speak(`Hello ${userData.name}, say ${userData.assistantName}`)
      scheduleRestart()
    }, 800)

    return () => {
      if (restartTimerRef.current) clearTimeout(restartTimerRef.current)
      try { recognition.stop() } catch {}
      synth.cancel()
    }
  }, [userData])

  /* ---------------- FIXED BUTTONS ---------------- */

  const toggleMic = () => {
    const newState = !micEnabledRef.current
    micEnabledRef.current = newState
    setMicEnabled(newState)

    if (newState) {
      setStatus('⏳ Ready...')
      scheduleRestart()
    } else {
      recognitionRef.current?.stop()
      setStatus('🔇 Mic Off')
    }
  }

  const handleSend = () => {
    if (!inputText.trim()) return
    addCommand(inputText)
    setInputText('')
  }

  const handleLogout = async () => {
    try {
      await axios.get('/api/auth/logout')
    } catch {}

    localStorage.removeItem('token')
    delete axios.defaults.headers.common['Authorization']
    setUserData(null)

    navigate('/signin', { replace: true })
  }

  const handleCustomize = () => {
    setHam(false)
    navigate('/customize')
  }

  /* ---------------- UI ---------------- */
  return (
    <div className="w-full h-screen bg-gradient-to-t from-black to-[#02023d] flex flex-col">

      {/* TOP */}
      <div className="flex justify-between p-4 text-white items-center">
        <h2>🤖 {userData?.assistantName}</h2>
        <CgMenuRight onClick={() => setHam(true)} className="cursor-pointer" />
      </div>

      {/* MENU */}
      {ham && (
        <div className="absolute inset-0 bg-black/95 p-6 flex flex-col gap-6 z-50">
          <RxCross1 onClick={() => setHam(false)} className="cursor-pointer text-white" />

          <button onClick={handleCustomize} className="text-white flex gap-2">
            <MdTune /> Customize
          </button>

          <button onClick={handleLogout} className="text-red-400 flex gap-2">
            <MdLogout /> Logout
          </button>
        </div>
      )}

      {/* MAIN */}
      <div className="flex-1 flex flex-col items-center justify-center text-white gap-3 px-4">

        <img src={userData?.assistantImage} className="w-[180px]" />

        <p>{status}</p>

        <img src={aiText ? aiImg : userImg} className="w-[70px]" />

        {userText && <p>You: {userText}</p>}
        {aiText && <p>{aiText}</p>}

        {/* INPUT */}
        <div className="flex gap-2 mt-4 bg-white rounded-full px-4 py-2 w-[90%] max-w-[500px] items-center">

          <input
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleSend()
            }}
            placeholder="Type command..."
            className="flex-1 bg-transparent outline-none text-black"
          />

          <button
            onClick={handleSend}
            disabled={!inputText.trim()}
            className="disabled:opacity-30"
          >
            <AiOutlineSend />
          </button>

          <button
            onClick={toggleMic}
            className={`p-2 rounded-full ${
              micEnabled ? 'bg-blue-500' : 'bg-red-500'
            } text-white`}
          >
            {micEnabled ? <BsMicFill /> : <BsMicMuteFill />}
          </button>

        </div>

      </div>
    </div>
  )
}

export default Home
