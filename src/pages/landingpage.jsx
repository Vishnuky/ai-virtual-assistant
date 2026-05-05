import React, { useContext } from 'react'
import { useNavigate } from 'react-router-dom'
import axios from 'axios'
import { userDataContext } from '../context/UserContext'

function LandingPage() {
  const { userData, setUserData, serverUrl } = useContext(userDataContext)
  const navigate = useNavigate()

  const handleLogOut = async () => {
    try {
      await axios.get(`${serverUrl}/api/auth/logout`, { withCredentials: true })
    } catch (err) {
      console.error(err)
    } finally {
      setUserData(null)
    }
  }

  return (
    <div
      style={{
        fontFamily: 'sans-serif',
        minHeight: '100vh',
        background:
          'linear-gradient(135deg, #02023d 0%, #0a0a6e 50%, #1a0550 100%)',
        color: '#fff',
      }}
    >
      {/* ── NAVBAR ── */}
      <nav
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '20px 40px',
          borderBottom: '0.5px solid rgba(255,255,255,0.1)',
        }}
      >
        <h2
          style={{
            fontSize: '20px',
            fontWeight: '600',
            color: '#fff',
            letterSpacing: '1px',
          }}
        >
          🤖 VoiceAI
        </h2>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          {userData ? (
            <>
              <span
                style={{ fontSize: '14px', color: 'rgba(255,255,255,0.6)' }}
              >
                Hey, {userData.name} 👋
              </span>
              <button onClick={() => navigate('/home')} style={btnPrimary}>
                Go to assistant
              </button>
              <button onClick={handleLogOut} style={btnGhost}>
                Log out
              </button>
            </>
          ) : (
            <>
              <button onClick={() => navigate('/signin')} style={btnGhost}>
                Sign in
              </button>
              <button onClick={() => navigate('/signup')} style={btnPrimary}>
                Get started
              </button>
            </>
          )}
        </div>
      </nav>

      {/* ── HERO ── */}
      <div
        style={{
          textAlign: 'center',
          padding: '80px 40px 60px',
          position: 'relative',
        }}
      >
        <div style={badge}>✨ Powered by Gemini 2.0 Flash</div>
        <h1
          style={{
            fontSize: '52px',
            fontWeight: '600',
            lineHeight: '1.15',
            margin: '20px 0 20px',
            color: '#fff',
          }}
        >
          Meet your personal
          <br />
          <span style={{ color: '#9F77DD' }}>AI companion</span>
        </h1>
        <p
          style={{
            fontSize: '18px',
            color: 'rgba(255,255,255,0.6)',
            maxWidth: '500px',
            margin: '0 auto 36px',
            lineHeight: '1.7',
          }}
        >
          Speak or type to search, play music, check the weather, open apps and
          more — instantly.
        </p>
        <div
          style={{
            display: 'flex',
            gap: '14px',
            justifyContent: 'center',
            flexWrap: 'wrap',
          }}
        >
          {userData ? (
            <button
              onClick={() => navigate('/home')}
              style={{ ...btnPrimary, padding: '14px 36px', fontSize: '16px' }}
            >
              Open assistant →
            </button>
          ) : (
            <>
              <button
                onClick={() => navigate('/signup')}
                style={{
                  ...btnPrimary,
                  padding: '14px 36px',
                  fontSize: '16px',
                }}
              >
                Get started free →
              </button>
              <button
                onClick={() => navigate('/signin')}
                style={{ ...btnGhost, padding: '14px 36px', fontSize: '16px' }}
              >
                Sign in
              </button>
            </>
          )}
        </div>

        {/* animated dots */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'center',
            gap: '14px',
            marginTop: '40px',
          }}
        >
          {[0, 0.4, 0.8].map((delay, i) => (
            <div
              key={i}
              style={{
                width: '10px',
                height: '10px',
                borderRadius: '50%',
                background: i === 1 ? '#1D9E75' : '#7F77DD',
                animation: `pulse 2s ${delay}s infinite`,
              }}
            />
          ))}
        </div>
      </div>

      {/* ── FEATURES ── */}
      <div
        style={{ maxWidth: '860px', margin: '0 auto', padding: '0 40px 60px' }}
      >
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
            gap: '16px',
          }}
        >
          {features.map((f, i) => (
            <div key={i} style={featureCard}>
              <div style={{ fontSize: '28px', marginBottom: '12px' }}>
                {f.icon}
              </div>
              <h3
                style={{
                  fontSize: '15px',
                  fontWeight: '600',
                  marginBottom: '8px',
                  color: '#fff',
                }}
              >
                {f.title}
              </h3>
              <p
                style={{
                  fontSize: '13px',
                  color: 'rgba(255,255,255,0.55)',
                  lineHeight: '1.6',
                }}
              >
                {f.desc}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* ── COMMANDS ── */}
      <div
        style={{ maxWidth: '860px', margin: '0 auto', padding: '0 40px 60px' }}
      >
        <div
          style={{
            background: 'rgba(255,255,255,0.05)',
            borderRadius: '16px',
            border: '0.5px solid rgba(255,255,255,0.1)',
            padding: '32px',
          }}
        >
          <h2
            style={{
              fontSize: '18px',
              fontWeight: '600',
              marginBottom: '20px',
              textAlign: 'center',
            }}
          >
            Try saying...
          </h2>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
              gap: '10px',
            }}
          >
            {commands.map((cmd, i) => (
              <div key={i} style={cmdPill}>
                {cmd}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── CTA ── */}
      <div
        style={{ maxWidth: '860px', margin: '0 auto', padding: '0 40px 80px' }}
      >
        <div
          style={{
            background: 'rgba(83,74,183,0.3)',
            border: '0.5px solid rgba(127,119,221,0.4)',
            borderRadius: '16px',
            padding: '40px',
            textAlign: 'center',
          }}
        >
          <h2
            style={{
              fontSize: '26px',
              fontWeight: '600',
              marginBottom: '10px',
            }}
          >
            {userData
              ? `Welcome back, ${userData.name}!`
              : 'Ready to get started?'}
          </h2>
          <p
            style={{
              color: 'rgba(255,255,255,0.6)',
              marginBottom: '28px',
              fontSize: '15px',
            }}
          >
            {userData
              ? 'Your assistant is ready and waiting for you.'
              : 'Sign up free. No credit card required.'}
          </p>
          {userData ? (
            <div
              style={{
                display: 'flex',
                gap: '12px',
                justifyContent: 'center',
                flexWrap: 'wrap',
              }}
            >
              <button
                onClick={() => navigate('/home')}
                style={{
                  ...btnPrimary,
                  padding: '13px 32px',
                  fontSize: '15px',
                }}
              >
                Open assistant →
              </button>
              <button
                onClick={() => navigate('/customize')}
                style={{ ...btnGhost, padding: '13px 32px', fontSize: '15px' }}
              >
                Customize
              </button>
            </div>
          ) : (
            <button
              onClick={() => navigate('/signup')}
              style={{ ...btnPrimary, padding: '13px 36px', fontSize: '15px' }}
            >
              Create free account →
            </button>
          )}
        </div>
      </div>

      {/* ── FOOTER ── */}
      <div
        style={{
          textAlign: 'center',
          padding: '20px',
          borderTop: '0.5px solid rgba(255,255,255,0.08)',
          color: 'rgba(255,255,255,0.3)',
          fontSize: '13px',
        }}
      >
        Built with React, Node.js & Gemini AI
      </div>

      {/* pulse animation */}
      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 0.3; transform: scale(1); }
          50% { opacity: 1; transform: scale(1.5); }
        }
      `}</style>
    </div>
  )
}

/* ── STYLES ── */
const btnPrimary = {
  background: '#534AB7',
  color: '#fff',
  border: 'none',
  padding: '10px 22px',
  borderRadius: '999px',
  fontSize: '14px',
  fontWeight: '500',
  cursor: 'pointer',
}

const btnGhost = {
  background: 'rgba(255,255,255,0.08)',
  color: 'rgba(255,255,255,0.85)',
  border: '0.5px solid rgba(255,255,255,0.2)',
  padding: '10px 22px',
  borderRadius: '999px',
  fontSize: '14px',
  cursor: 'pointer',
}

const badge = {
  display: 'inline-block',
  background: 'rgba(99,80,221,0.25)',
  color: '#AFA9EC',
  fontSize: '13px',
  padding: '5px 16px',
  borderRadius: '999px',
  border: '0.5px solid rgba(175,169,236,0.3)',
}

const featureCard = {
  background: 'rgba(255,255,255,0.05)',
  border: '0.5px solid rgba(255,255,255,0.1)',
  borderRadius: '14px',
  padding: '24px 20px',
}

const cmdPill = {
  background: 'rgba(255,255,255,0.07)',
  border: '0.5px solid rgba(255,255,255,0.12)',
  borderRadius: '999px',
  padding: '9px 16px',
  fontSize: '13px',
  color: 'rgba(255,255,255,0.7)',
  textAlign: 'center',
}

/* ── DATA ── */
const features = [
  {
    icon: '🎙️',
    title: 'Voice recognition',
    desc: 'Say your assistant name and speak naturally. No buttons needed.',
  },
  {
    icon: '⚡',
    title: 'Smart commands',
    desc: 'Search, play YouTube, weather, open apps and more.',
  },
  {
    icon: '🤖',
    title: 'Gemini powered',
    desc: 'Backed by Google Gemini 2.0 Flash for fast, smart responses.',
  },
  {
    icon: '🎨',
    title: 'Customizable',
    desc: 'Set your assistant name, avatar and personality.',
  },
]

const commands = [
  '"Play lo-fi music"',
  '"What\'s the weather?"',
  '"Search for recipes"',
  '"What time is it?"',
  '"Open Instagram"',
  '"Tell me a joke"',
  '"Search YouTube"',
  '"Open calculator"',
]

export default LandingPage
