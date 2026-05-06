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
  const isProcessingRef = useRef(false)
  const micEnabledRef = useRef(true)
  const isListeningRef = useRef(false)
  const restartTimerRef = useRef(null)
  const commandQueueRef = useRef([])        // ✅ queue for continuous commands
  const isQueueRunningRef = useRef(false)   // ✅ prevents parallel queue runs
  const synth = window.speechSynthesis

  /* ---------------- LOGOUT ---------------- */
  const handleLogOut = async () => {
    try { await axios.get("/api/auth/logout") } catch {}
    localStorage.removeItem("token")
    delete axios.defaults.headers.common["Authorization"]
    setUserData(null)
    navigate('/signin')
  }

  /* ---------------- SPEAK — returns Promise that resolves when speech ends ---------------- */
  const speak = useCallback((text) => {
    return new Promise((resolve) => {
      if (!text) return resolve()
      synth.cancel()
      const utter = new SpeechSynthesisUtterance(text)
      utter.lang = 'en-IN'
      utter.rate = 1
      utter.pitch = 1
      utter.onend = () => resolve()
      utter.onerror = () => resolve()
      synth.speak(utter)
    })
  }, [])

  /* ---------------- SCHEDULE MIC RESTART ---------------- */
  const scheduleRestart = useCallback(() => {
    if (restartTimerRef.current) {
      clearTimeout(restartTimerRef.current)
      restartTimerRef.current = null
    }
    restartTimerRef.current = setTimeout(() => {
      restartTimerRef.current = null
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
    }, 600)
  }, [])

  /* ---------------- EXECUTE ACTION AFTER SPEECH ---------------- */
  const executeAction = useCallback(async (data, originalText) => {
    if (!data) return
    const { type, userInput, response } = data
    const query = encodeURIComponent(userInput || originalText || '')
    const lower = (originalText || '').toLowerCase()

    // ✅ Determine what to say and where to open
    let speechText = response || ''
    let urlToOpen = null

    if (lower.includes('hi') || lower.includes('hello') || lower.includes('hey')) {
      speechText = speechText || `Hello! How can I help you?`
    } else if (lower.includes('youtube')) {
      speechText = speechText || `Opening YouTube`
      urlToOpen = `https://www.youtube.com/results?search_query=${encodeURIComponent(
        lower.replace(/open|youtube|play/gi, '').trim() || 'youtube'
      )}`
    } else if (lower.includes('facebook')) {
      speechText = speechText || `Opening Facebook`
      urlToOpen = `https://www.facebook.com/`
    } else if (lower.includes('instagram')) {
      speechText = speechText || `Opening Instagram`
      urlToOpen = `https://www.instagram.com/`
    } else if (lower.includes('spotify')) {
      speechText = speechText || `Opening Spotify`
      urlToOpen = `https://open.spotify.com/`
    } else if (lower.includes('whatsapp')) {
      speechText = speechText || `Opening WhatsApp`
      urlToOpen = `https://web.whatsapp.com/`
    } else if (lower.includes('calculator')) {
      speechText = speechText || `Opening calculator`
      urlToOpen = `https://www.google.com/search?q=calculator`
    } else if (lower.includes('weather')) {
      speechText = speechText || `Here is today's weather`
      urlToOpen = `https://www.google.com/search?q=weather+today`
    } else if (
      type === 'google-search' ||
      lower.includes('search') ||
      lower.includes('find') ||
      lower.includes('where') ||
      lower.includes('what') ||
      lower.includes('who') ||
      lower.includes('when') ||
      lower.includes('how')
    ) {
      speechText = speechText || `Here is what I found on the web`
      urlToOpen = `https://www.google.com/search?q=${query}`
    } else if (type === 'get-date' || type === 'get-time' || type === 'get-day' || type === 'get-month') {
      speechText = speechText || response
    } else if (type === 'general') {
      speechText = speechText || response || `Here is what I found`
      if (!speechText.toLowerCase().includes('hello') && userInput) {
        urlToOpen = `https://www.google.com/search?q=${query}`
      }
    }

    setAiText(speechText)

    // ✅ SPEAK FIRST — wait for speech to finish
    await speak(speechText)

    // ✅ THEN open URL after speech
    if (urlToOpen) {
      await new Promise(r => setTimeout(r, 300))
      window.open(urlToOpen, '_blank')
    }
  }, [speak])

  /* ---------------- PROCESS QUEUE — handles continuous commands ---------------- */
  const processQueue = useCallback(async () => {
    if (isQueueRunningRef.current) return
    isQueueRunningRef.current = true

    while (commandQueueRef.current.length > 0) {
      const text = commandQueueRef.current.shift()
      isProcessingRef.current = true

      setUserText(text)
      setAiText('')
      setStatus('🤔 Thinking...')
      console.log('🚀 Processing:', text)

      try {
        const data = await getGeminiResponse(text)
        console.log('🧠 AI:', data)
        await executeAction(data, text)
      } catch (err) {
        console.error(err)
        await speak("Sorry, something went wrong")
      }

      isProcessingRef.current = false
      setStatus('⏳ Ready...')

      // ✅ Small gap between commands
      if (commandQueueRef.current.length > 0) {
        await new Promise(r => setTimeout(r, 500))
      }
    }

    isQueueRunningRef.current = false

    // ✅ Restart mic after queue is done
    scheduleRestart()
  }, [getGeminiResponse, executeAction, speak, scheduleRestart])

  /* ---------------- ADD TO QUEUE ---------------- */
  const addCommand = useCallback((text) => {
    if (!text?.trim()) return

    // ✅ Max 5 commands in queue at once
    if (commandQueueRef.current.length >= 5) {
      console.log("Queue full, dropping:", text)
      return
    }

    commandQueueRef.current.push(text.trim())
    console.log('📥 Queued:', text, '| Queue length:', commandQueueRef.current.length)
    processQueue()
  }, [processQueue])

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
    recognition.continuous = false
    recognition.lang = 'en-IN'
    recognition.interimResults = false
    recognition.maxAlternatives = 1
    recognitionRef.current = recognition

    recognition.onstart = () => {
      console.log('🎙️ Listening...')
      isListeningRef.current = true
      setListening(true)
      setStatus('🎙️ Listening...')
    }

    recognition.onend = () => {
      console.log('🎙️ Mic ended')
      isListeningRef.current = false
      setListening(false)
      if (micEnabledRef.current && !isProcessingRef.current) {
        setStatus('⏳ Ready...')
        scheduleRestart()
      }
    }

    recognition.onerror = (e) => {
      console.log('🎙️ Error:', e.error)
      isListeningRef.current = false
      setListening(false)

      if (e.error === 'not-allowed' || e.error === 'service-not-allowed') {
        micEnabledRef.current = false
        setMicEnabled(false)
        setStatus('🔇 Mic blocked')
        return
      }
      // onend handles restart
    }

    recognition.onresult = (e) => {
      const transcript = e.results[e.results.length - 1][0].transcript.trim()
      console.log('🎤 Heard:', transcript)

      const wake = userData.assistantName.toLowerCase()
      const lower = transcript.toLowerCase()

      if (lower.includes(wake)) {
        const clean = lower.replace(wake, '').trim()
        console.log('🧠 Command:', clean)
        if (clean) addCommand(clean)
      }
    }

    // Greeting
    setTimeout(async () => {
      await speak(`Hello ${userData.name}, I am ${userData.assistantName}. Say my name followed by your command.`)
      scheduleRestart()
    }, 800)

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
      setStatus('🔇 Mic Off')
    }
  }, [scheduleRestart])

  /* ---------------- UI ---------------- */
  return (
    <div className="w-full h-screen bg-gradient-to-t from-black to-[#02023d] flex flex-col">

      {/* TOP BAR */}
      <div className="flex justify-between p-4 text-white items-center">
        <h2 className="text-lg font-semibold">🤖 {userData?.assistantName}</h2>
        <CgMenuRight onClick={() => setHam(true)} className="cursor-pointer w-6 h-6" />
      </div>

      {/* SIDE MENU */}
      {ham && (
        <div className="absolute inset-0 bg-black/90 p-6 flex flex-col gap-6 z-50">
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

      {/* MAIN CONTENT */}
      <div className="flex-1 flex flex-col items-center justify-center text-white gap-3 px-4">

        {/* ASSISTANT IMAGE */}
        <img
          src={userData?.assistantImage}
          className="w-[180px] h-[230px] rounded-xl object-cover shadow-lg shadow-blue-900"
          alt="assistant"
        />

        {/* STATUS */}
        <p className="text-sm text-blue-300">{status}</p>

        {/* AVATAR GIF */}
        <img
          src={aiText ? aiImg : userImg}
          className="w-[70px]"
          alt="status gif"
        />

        {/* CONVERSATION */}
        {userText && (
          <p className="text-gray-400 text-sm text-center max-w-[400px]">
            You: {userText}
          </p>
        )}
        {aiText && (
          <p className="text-white text-center max-w-[400px] text-sm leading-relaxed">
            {userData?.assistantName}: {aiText}
          </p>
        )}

        {/* TEXT INPUT BAR */}
        <div className="flex gap-2 mt-4 bg-white rounded-full px-4 py-2 w-[90%] max-w-[500px] items-center shadow-lg">
          <input
            value={inputText}
            onChange={e => setInputText(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter' && inputText.trim()) {
                addCommand(inputText.trim())
                setInputText('')
              }
            }}
            placeholder="Type a command..."
            className="flex-1 bg-transparent outline-none text-black text-sm"
          />
          <button
            onClick={() => {
              if (inputText.trim()) {
                addCommand(inputText.trim())
                setInputText('')
              }
            }}
          >
            <AiOutlineSend size={20} className="text-gray-700" />
          </button>
          <button
            onClick={toggleMic}
            className={`p-2 rounded-full transition-all ${
              micEnabled ? 'bg-blue-500 text-white' : 'bg-red-500 text-white'
            }`}
          >
            {micEnabled ? <BsMicFill /> : <BsMicMuteFill />}
          </button>
        </div>

        {/* QUEUE INDICATOR */}
        {commandQueueRef.current?.length > 0 && (
          <p className="text-xs text-gray-500">
            {commandQueueRef.current.length} command(s) pending...
          </p>
        )}

      </div>
    </div>
  )
}

export default Home
