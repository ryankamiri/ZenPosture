import React, { useState } from 'react'
import { IoNotifications, IoNotificationsOff } from 'react-icons/io5'
import { BiBody } from 'react-icons/bi'
import { FiActivity, FiClock, FiCheckCircle } from 'react-icons/fi'
import WebcamView from '../components/WebcamView'
import { useNavigate } from 'react-router-dom'
function Home() {
  const [notificationsEnabled, setNotificationsEnabled] = useState(true)
  const [showStats, setShowStats] = useState(false)
  const navigate = useNavigate()

  const sendTestNotification = () => {
    if (!("Notification" in window)) {
      alert("This browser does not support desktop notifications")
      return
    }

    Notification.requestPermission().then(permission => {
      if (permission === "granted") {
        const notification = new Notification("Time for Posture Exercises!", {
          body: "Let's do some stretches to maintain good posture 🧘‍♂️",
          silent: false,
          icon: './officiallogo.png',
        })

        notification.onclick = () => {
          navigate('/exercises')
          window.focus()
        }
      }
    })
  }

  const toggleNotifications = () => {
    setNotificationsEnabled(!notificationsEnabled)
  }

  const toggleStats = () => {
    setShowStats(!showStats)
  }

  const addRandomSession = async () => {
    try {
      // Generate random score between 60 and 100
      const randomScore = Math.floor(Math.random() * (100 - 60 + 1)) + 60
      
      console.log('Adding random session with score:', randomScore)
      
      await window.api.addPostureSession({
        score: randomScore
      })
      
      console.log('Successfully added session')
    } catch (error) {
      console.error('Failed to add random session:', error)
    }
  }

  // Function to add multiple random sessions
  const addMultipleRandomSessions = async (count = 5) => {
    try {
      console.log(`Adding ${count} random sessions...`)
      
      for (let i = 0; i < count; i++) {
        // Add some random delay between sessions (0-2 seconds)
        await new Promise(resolve => setTimeout(resolve, Math.random() * 2000))
        
        await addRandomSession()
      }
      
      console.log('Successfully added multiple sessions')
    } catch (error) {
      console.error('Failed to add multiple sessions:', error)
    }
  }

  return (
    <div className="home-container">
      <div className="welcome-section">
        <BiBody className="welcome-icon" />
        <h1>Welcome to Zen Posture</h1>
        <p>Your personal posture companion for a healthier workday</p>
      </div>

      <div className="content-grid">
        <div className="main-content-area">
          <WebcamView />
        </div>

        <div className="side-content-area">
          <div className="notification-card">
            <div className="notification-header">
              <div className="header-content">
                {notificationsEnabled ? 
                  <IoNotifications className="notification-icon" /> : 
                  <IoNotificationsOff className="notification-icon" />
                }
                <h2>Posture Reminders</h2>
              </div>
              <label className="toggle-switch">
                <input
                  type="checkbox"
                  checked={notificationsEnabled}
                  onChange={toggleNotifications}
                />
                <span className="toggle-slider"></span>
              </label>
            </div>
            <p className="notification-status">
              Reminders are currently {notificationsEnabled ? 'enabled' : 'disabled'}
            </p>
            <p className="notification-description">
              You will receive gentle reminders every 60 minutes to check your posture
            </p>
            
            <button 
              className="test-notification-btn"
              onClick={sendTestNotification}
              disabled={!notificationsEnabled}
            >
              Test Notification
            </button>
          </div>

          <div className="stats-section">
            <button 
              className="stats-toggle-btn"
              onClick={toggleStats}
            >
              <FiActivity className="btn-icon" />
              {showStats ? 'Hide Today\'s Progress' : 'Show Today\'s Progress'}
            </button>

            {showStats && (
              <div className="stats-popup">
                <div className="stats-card">
                  <h3>Today's Progress</h3>
                  <div className="stats-grid">
                    <div className="stat-item">
                      <FiCheckCircle className="stat-icon" />
                      <span className="stat-value">6</span>
                      <span className="stat-label">Exercises Completed</span>
                    </div>
                    <div className="stat-item">
                      <FiActivity className="stat-icon" />
                      <span className="stat-value">75%</span>
                      <span className="stat-label">Compliance Rate</span>
                    </div>
                    <div className="stat-item">
                      <FiClock className="stat-icon" />
                      <span className="stat-value">4h</span>
                      <span className="stat-label">Time Active</span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Test buttons */}
          <div className="test-controls" style={{ marginTop: '20px' }}>
            <button 
              onClick={addRandomSession}
              style={{
                padding: '10px 20px',
                marginRight: '10px',
                backgroundColor: '#6c5ce7',
                color: 'white',
                border: 'none',
                borderRadius: '5px',
                cursor: 'pointer'
              }}
            >
              Add Random Session
            </button>
            
            <button 
              onClick={() => addMultipleRandomSessions(5)}
              style={{
                padding: '10px 20px',
                backgroundColor: '#a55eea',
                color: 'white',
                border: 'none',
                borderRadius: '5px',
                cursor: 'pointer'
              }}
            >
              Add 5 Random Sessions
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Home 