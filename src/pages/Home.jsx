import React, { useContext, useEffect, useRef, useState, useCallback } from 'react'
import { userDataContext } from '../context/UserContext'
import { useNavigate } from 'react-router-dom'
import axios from 'axios'
import aiImg from '../assets/ai.gif'
import userImg from '../assets/user.gif'
import { CgMenuRight } from 'react-icons/cg'
import { RxCross1 } from 'react-icons/rx'
import { AiOutlineSend } from 'react-icons/ai'
import { BsMicFill, BsMicMuteFill } from 'react-icons/bs'

function Home() {
  const { userData, serverUrl, setUserData, getGeminiResponse } =
    useContext(userDataContext)
  const navigate = useNavigate()

  const [listening, setListening] = useState(false)
  const [userText, setUserText] = useState('')
  const [aiText, setAiText] = useState('')
  const [ham, setHam] = useState(false)
  const [inputText, setInputText] = useState('')
  const [micEnabled, setMicEnabled] = useState(true)

  const recognitionRef = useRef(null)
  const isSpeakingRef = useRef(false)
  const isRecognizingRef = useRef(false)
  const isProcessingRef = useRef(false)
  const micEnabledRef = useRef(true)

  const synth = window.speechSynthesis

  /* ---------------- LOGOUT ---------------- */
  const handleLogOut = async () => {
    try {
      await axios.get(`${serverUrl}/api/auth/logout`, { withCredentials: true })
    } catch (err) {
      console.error(err)
    } finally {
      setUserData(null)
      navigate('/signin')
    }
  }

  /* ---------------- SPEAK ---------------- */
  const speak = useCallback(text => {
    if (!text) return
    synth.cancel()

    const utterance = new SpeechSynthesisUtterance(text)
    utterance.lang = 'en-US'
    const voices = synth.getVoices()
    const englishVoice = voices.find(v => v.lang === 'en-US')
    if (englishVoice) utterance.voice = englishVoice

    isSpeakingRef.current = true

    utterance.onend = () => {
      isSpeakingRef.current = false
      setAiText('')
      if (micEnabledRef.current) startRecognition(800)
    }

    synth.speak(utterance)
  }, [])

  /* ---------------- COMMAND HANDLER ---------------- */
  const handleCommand = useCallback(data => {
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

    if (routes[type]) window.open(routes[type], '_blank')
  }, [speak])

  /* ---------------- PROCESS COMMAND (shared by mic + text) ---------------- */
  const processCommand = useCallback(async transcript => {
    if (isProcessingRef.current) return
    isProcessingRef.current = true

    recognitionRef.current?.stop()
    setUserText(transcript)
    setAiText('')

    try {
      const data = await getGeminiResponse(transcript)
      if (data?.response) setAiText(data.response)
      setUserText('')
      handleCommand(data)
    } catch (err) {
      console.error('Gemini error:', err)
      setUserText('')
    } finally {
      isProcessingRef.current = false
    }
  }, [getGeminiResponse, handleCommand])

  /* ---------------- TEXT SUBMIT ---------------- */
  const handleTextSubmit = () => {
    const text = inputText.trim()
    if (!text) return
    setInputText('')
    processCommand(text)
  }

  /* ---------------- START RECOGNITION ---------------- */
  const startRecognition = (delay = 0) => {
    if (
      !recognitionRef.current ||
      isSpeakingRef.current ||
      isRecognizingRef.current ||
      !micEnabledRef.current
    ) return

    setTimeout(() => {
      try {
        recognitionRef.current.start()
      } catch (err) {
        if (err.name !== 'InvalidStateError') console.error(err)
      }
    }, delay)
  }

  /* ---------------- TOGGLE MIC ---------------- */
  const toggleMic = () => {
    const newState = !micEnabledRef.current
    micEnabledRef.current = newState
    setMicEnabled(newState)

    if (!newState) {
      recognitionRef.current?.stop()
      setListening(false)
    } else {
      startRecognition(300)
    }
  }

  /* ---------------- SETUP RECOGNITION ---------------- */
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
      if (micEnabledRef.current) startRecognition(1000)
    }

    recognition.onerror = e => {
      console.error('Recognition error:', e.error)
      isRecognizingRef.current = false
      setListening(false)
      if (e.error === 'aborted' || e.error === 'not-allowed') return
      if (micEnabledRef.current) startRecognition(1000)
    }

    recognition.onresult = async e => {
      const transcript = e.results[e.results.length - 1][0].transcript.trim()
      console.log('Heard:', transcript)

      if (
        transcript.toLowerCase().includes(userData.assistantName.toLowerCase()) &&
        !isProcessingRef.current
      ) {
        processCommand(transcript)
      }
    }

    // ✅ Start mic only after greeting finishes
    const greet = new SpeechSynthesisUtterance(
      `Hello ${userData.name}, what can I help you with?`
    )
    greet.lang = 'en-US'
    greet.onend = () => {
      isSpeakingRef.current = false
      if (micEnabledRef.current) startRecognition(500)
    }
    isSpeakingRef.current = true
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
        className="lg:hidden text-white absolute top-5 right-5 w-6 h-6 cursor-pointer"
        onClick={() => setHam(true)}
      />

      {ham && (
        <div className="absolute inset-0 bg-black/60 backdrop-blur-lg p-5 flex flex-col gap-5 z-10">
          <RxCross1
            className="text-white absolute top-5 right-5 w-6 h-6 cursor-pointer"
            onClick={() => setHam(false)}
          />
          <button onClick={handleLogOut} className="btn">Log Out</button>
          <button onClick={() => navigate('/customize')} className="btn">Customize Assistant</button>
        </div>
      )}

      <div className="w-[300px] h-[400px] rounded-xl overflow-hidden shadow-lg">
        <img
          src={userData?.assistantImage}
          alt="assistant"
          className="h-full w-full object-cover"
        />
      </div>

      <h1 className="text-white font-semibold">I'm {userData?.assistantName}</h1>

      <p className="text-gray-400 text-sm">
        {!micEnabled ? '🔇 Mic Off' : listening ? '🎙️ Listening...' : '⏸️ Waiting...'}
      </p>

      <img src={aiText ? aiImg : userImg} alt="state" className="w-[150px]" />

      <h1 className="text-white text-center px-4 min-h-[28px]">
        {userText || aiText || ''}
      </h1>

      {/* ✅ Search bar + mic toggle */}
      <div className="w-[90%] max-w-[500px] flex items-center gap-2 bg-white/10 border border-white/20 rounded-full px-4 py-2 mt-2">
        <input
          type="text"
          value={inputText}
          onChange={e => setInputText(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleTextSubmit()}
          placeholder={`Ask ${userData?.assistantName || 'assistant'} anything...`}
          className="flex-1 bg-transparent outline-none text-white placeholder-gray-400 text-[15px]"
        />

        <button
          onClick={handleTextSubmit}
          disabled={!inputText.trim()}
          className="text-white hover:text-blue-400 transition disabled:opacity-30"
        >
          <AiOutlineSend className="w-5 h-5" />
        </button>

        <button
          onClick={toggleMic}
          className={`transition ${micEnabled ? 'text-blue-400 hover:text-white' : 'text-red-400 hover:text-white'}`}
        >
          {micEnabled
            ? <BsMicFill className="w-5 h-5" />
            : <BsMicMuteFill className="w-5 h-5" />
          }
        </button>
      </div>

    </div>
  )
}

export default Home