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
    } catch (e) {
      console.log('Start blocked:', e.message)
    }
  }

  /* ---------------- SCHEDULE RESTART ---------------- */
  const scheduleRestart = useCallback(() => {
    if (restartTimerRef.current) {
      clearTimeout(restartTimerRef.current)
    }

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

  /* ---------------- ACTION ---------------- */
  const executeAction = useCallback(async (data, originalText) => {
    if (!data) return

    const { response, userInput } = data
    const query = encodeURIComponent(userInput || originalText || '')

    let speechText = response || 'Here is what I found'
    let url = `https://www.google.com/search?q=${query}`

    setAiText(speechText)
    await speak(speechText)

    if (url) {
      window.open(url, '_blank')
    }
  }, [speak])

  /* ---------------- QUEUE ---------------- */
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

  const addCommand = useCallback((text) => {
    if (!text?.trim()) return
    commandQueueRef.current.push(text.trim())
    processQueue()
  }, [processQueue])

  /* ---------------- MIC SETUP ---------------- */
  useEffect(() => {
    if (!userData) return

    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition

    if (!SpeechRecognition) {
      alert('Speech recognition not supported')
      return
    }

    const recognition = new SpeechRecognition()
    recognition.continuous = false
    recognition.lang = 'en-IN'
    recognitionRef.current = recognition

    recognition.onstart = () => {
      isListeningRef.current = true
      setListening(true)
      setStatus('🎙️ Listening...')
      console.log('🎙️ Listening...')
    }

    recognition.onend = () => {
      isListeningRef.current = false
      setListening(false)
      console.log('🎙️ Mic ended')

      if (!micEnabledRef.current || isProcessingRef.current) return
      scheduleRestart()
    }

    recognition.onerror = (e) => {
      console.log('🎙️ Error:', e.error)

      isListeningRef.current = false
      setListening(false)

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
      console.log('🎤 Heard:', transcript)

      const wakeWord = userData.assistantName?.toLowerCase() || 'assistant'

      if (transcript.includes(wakeWord)) {
        const command = transcript.replace(wakeWord, '').trim()
        if (command) {
          console.log('🧠 Command:', command)
          addCommand(command)
        }
      }
    }

    /* GREETING */
    setTimeout(async () => {
      await speak(`Hello ${userData.name}, say ${userData.assistantName} to wake me.`)
      scheduleRestart()
    }, 1000)

    return () => {
      if (restartTimerRef.current) clearTimeout(restartTimerRef.current)

      try {
        recognition.stop()
      } catch {}

      synth.cancel()
    }
  }, [userData])

  /* ---------------- TOGGLE MIC ---------------- */
  const toggleMic = () => {
    const newState = !micEnabledRef.current
    micEnabledRef.current = newState
    setMicEnabled(newState)

    if (newState) {
      scheduleRestart()
    } else {
      if (restartTimerRef.current) clearTimeout(restartTimerRef.current)
      recognitionRef.current?.stop()
      setStatus('🔇 Mic Off')
    }
  }

  /* ---------------- LOGOUT ---------------- */
  const handleLogOut = async () => {
    try { await axios.get("/api/auth/logout") } catch {}
    localStorage.removeItem("token")
    setUserData(null)
    navigate('/signin')
  }

  /* ---------------- UI ---------------- */
  return (
    <div className="w-full h-screen bg-gradient-to-t from-black to-[#02023d] flex flex-col">

      <div className="flex justify-between p-4 text-white">
        <h2>🤖 {userData?.assistantName}</h2>
        <CgMenuRight onClick={() => setHam(true)} />
      </div>

      {ham && (
        <div className="absolute inset-0 bg-black/90 p-6 flex flex-col gap-6">
          <RxCross1 onClick={() => setHam(false)} />
          <button onClick={() => navigate('/customize')}>
            <MdTune /> Customize
          </button>
          <button onClick={handleLogOut}>
            <MdLogout /> Logout
          </button>
        </div>
      )}

      <div className="flex-1 flex flex-col items-center justify-center text-white gap-3">

        <img src={userData?.assistantImage} className="w-[180px]" />

        <p>{status}</p>

        <img src={aiText ? aiImg : userImg} className="w-[70px]" />

        {userText && <p>You: {userText}</p>}
        {aiText && <p>{aiText}</p>}

        <div className="flex gap-2 bg-white rounded-full px-4 py-2 w-[90%] max-w-[500px]">
          <input
            value={inputText}
            onChange={e => setInputText(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter') {
                addCommand(inputText)
                setInputText('')
              }
            }}
            className="flex-1 text-black"
          />

          <button onClick={() => {
            addCommand(inputText)
            setInputText('')
          }}>
            <AiOutlineSend />
          </button>

          <button onClick={toggleMic}>
            {micEnabled ? <BsMicFill /> : <BsMicMuteFill />}
          </button>
        </div>

      </div>
    </div>
  )
}

export default Home
