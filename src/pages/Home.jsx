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

function Home() {
  const { userData, serverUrl, setUserData, getGeminiResponse } =
    useContext(userDataContext)
  const navigate = useNavigate()

  const [listening, setListening] = useState(false)
  const [userText, setUserText] = useState('')
  const [aiText, setAiText] = useState('')
  const [ham, setHam] = useState(false)

  const recognitionRef = useRef(null)
  const isSpeakingRef = useRef(false)
  const isRecognizingRef = useRef(false)

  const synth = window.speechSynthesis

  /* ---------------- LOGOUT ---------------- */
  const handleLogOut = async () => {
    try {
      await axios.get(`${serverUrl}/api/auth/logout`, {
        withCredentials: true,
      })
    } catch (err) {
      console.error(err)
    } finally {
      setUserData(null)
      navigate('/signin')
    }
  }

  /* ---------------- SPEECH ---------------- */
  const speak = useCallback(text => {
    if (!text) return

    synth.cancel()

    const utterance = new SpeechSynthesisUtterance(text)
    utterance.lang = 'en-US' // ✅ consistent with recognition lang

    const voices = synth.getVoices()
    const englishVoice = voices.find(v => v.lang === 'en-US')
    if (englishVoice) utterance.voice = englishVoice

    isSpeakingRef.current = true

    utterance.onend = () => {
      isSpeakingRef.current = false
      setAiText('')
      startRecognition(800)
    }

    synth.speak(utterance)
  }, [])

  /* ---------------- COMMAND HANDLER ---------------- */
  const handleCommand = useCallback(
    data => {
      if (!data) return
      const { type, userInput, response } = data

      speak(response)

      const query = encodeURIComponent(userInput || '')

      const routes = {
        'google-search': `https://www.google.com/search?q=${query}`,
        'calculator-open': `https://www.google.com/search?q=calculator`,
        'instagram-open': 'https://www.instagram.com/',
        'facebook-open': 'https://www.facebook.com/',
        'weather-show': `https://www.google.com/search?q=weather`,
        'youtube-search': `https://www.youtube.com/results?search_query=${query}`,
        'youtube-play': `https://www.youtube.com/results?search_query=${query}`,
      }

      if (routes[type]) {
        window.open(routes[type], '_blank')
      }
    },
    [speak]
  )

  /* ---------------- SPEECH RECOGNITION ---------------- */
  const startRecognition = (delay = 0) => {
    if (
      !recognitionRef.current ||
      isSpeakingRef.current ||
      isRecognizingRef.current
    )
      return

    setTimeout(() => {
      try {
        recognitionRef.current.start()
      } catch (err) {
        if (err.name !== 'InvalidStateError') {
          console.error(err)
        }
      }
    }, delay)
  }

  useEffect(() => {
    if (!userData) return

    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition

    if (!SpeechRecognition) {
      console.warn('Speech Recognition not supported')
      return
    }

    const recognition = new SpeechRecognition()
    recognition.continuous = true
    recognition.lang = 'en-US'
    recognition.interimResults = false

    recognitionRef.current = recognition

    recognition.onstart = () => {
      isRecognizingRef.current = true
      setListening(true)
    }

    recognition.onend = () => {
      isRecognizingRef.current = false
      setListening(false)
      startRecognition(1000)
    }

    recognition.onerror = e => {
      console.error('Recognition error:', e.error) // ✅ log actual error
      isRecognizingRef.current = false
      setListening(false)
      if (e.error === 'aborted') return
      startRecognition(1000)
    }

    recognition.onresult = async e => {
      const transcript = e.results[e.results.length - 1][0].transcript.trim()
      console.log('Heard:', transcript) // ✅ debug log

      if (
        transcript.toLowerCase().includes(userData.assistantName.toLowerCase())
      ) {
        recognition.stop()
        setUserText(transcript)
        setAiText('')

        try {
          const data = await getGeminiResponse(transcript)
          if (data?.response) {
            setAiText(data.response) // ✅ set BEFORE speak
          }
          setUserText('')
          handleCommand(data) // ✅ speak AFTER state update
        } catch (err) {
          console.error('Gemini error:', err)
          setUserText('')
        }
      }
    }

    startRecognition(1000)

    // ✅ Greeting in English to match recognition lang
    const greet = new SpeechSynthesisUtterance(
      `Hello ${userData.name}, what can I help you with?`
    )
    greet.lang = 'en-US'
    synth.speak(greet)

    return () => {
      recognition.stop()
      synth.cancel()
      isRecognizingRef.current = false
      isSpeakingRef.current = false
    }
  }, [userData])

  /* ---------------- UI ---------------- */
  return (
    <div className="w-full h-[100vh] bg-gradient-to-t from-black to-[#02023d] flex flex-col items-center justify-center gap-4 overflow-hidden">
      <CgMenuRight
        className="lg:hidden text-white absolute top-5 right-5 w-6 h-6"
        onClick={() => setHam(true)}
      />

      {ham && (
        <div className="absolute inset-0 bg-black/60 backdrop-blur-lg p-5 flex flex-col gap-5">
          <RxCross1
            className="text-white absolute top-5 right-5 w-6 h-6"
            onClick={() => setHam(false)}
          />
          <button onClick={handleLogOut} className="btn">
            Log Out
          </button>
          <button onClick={() => navigate('/customize')} className="btn">
            Customize Assistant
          </button>
        </div>
      )}

      <div className="w-[300px] h-[400px] rounded-xl overflow-hidden shadow-lg">
        <img
          src={userData?.assistantImage}
          alt="assistant"
          className="h-full w-full object-cover"
        />
      </div>

      <h1 className="text-white font-semibold">
        I'm {userData?.assistantName}
      </h1>

      {/* ✅ shows mic status */}
      <p className="text-gray-400 text-sm">
        {listening ? '🎙️ Listening...' : '🔇 Not listening'}
      </p>

      <img src={aiText ? aiImg : userImg} alt="state" className="w-[200px]" />

      <h1 className="text-white text-center px-4">
        {userText || aiText || ''}
      </h1>
    </div>
  )
}

export default Home
