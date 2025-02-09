import React, { useState, useEffect } from 'react'
import { IoNotifications, IoNotificationsOff } from 'react-icons/io5'
import { BiBody } from 'react-icons/bi'
import { FiActivity, FiClock, FiCheckCircle, FiPlus, FiPlusCircle } from 'react-icons/fi'
import WebcamView from '../components/WebcamView'
import { useNavigate } from 'react-router-dom'

function Home() {
  const [notificationsEnabled, setNotificationsEnabled] = useState(true)
  const [showStats, setShowStats] = useState(false)
  const [currentScore, setCurrentScore] = useState(100)
  const navigate = useNavigate()

  // Function to generate random score between 40 and 100
  const generateRandomScore = () => {
    return Math.floor(Math.random() * (100 - 40 + 1)) + 40;
  }

  // Function to send exercise reminder notification
  const sendExerciseReminder = () => {
    if (!("Notification" in window)) {
      alert("This browser does not support desktop notifications")
      return
    }

    if (notificationsEnabled) {
      const notification = new Notification("Time for Posture Exercises!", {
        body: "Let's do some stretches to maintain good posture 🧘‍♂️",
        silent: false,
        icon: './officiallogo.png'
      })

      notification.onclick = () => {
        navigate('/exercises')
        window.focus()
      }
    }
  }

  // Function to check posture and send notification if needed
  const checkPosture = async () => {
    const newScore = generateRandomScore()
    setCurrentScore(newScore)
    
    try {
      await window.api.addPostureSession({
        score: newScore
      })
      
      // If score is below 60, send notification
      if (newScore < 60 && notificationsEnabled) {
        new Notification("Poor Posture Detected!", {
          body: "Your posture score is low. Please adjust your sitting position 🪑",
          silent: false,
          icon: './officiallogo.png'
        })
      }
    } catch (error) {
      console.error('Failed to add posture session:', error)
    }
  }

  // Set up intervals for both posture checks and exercise reminders
  useEffect(() => {
    // Initial checks
    checkPosture()
    sendExerciseReminder()

    // Check posture every 5 seconds
    const postureInterval = setInterval(checkPosture, 5000)
    
    // Send exercise reminder every 20 minutes
    const exerciseInterval = setInterval(sendExerciseReminder, 100000)

    return () => {
      clearInterval(postureInterval)
      clearInterval(exerciseInterval)
    }
  }, [notificationsEnabled]) // Re-run if notifications are toggled

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
          <div className="posture-score-display">
            <h2>Current Posture Score</h2>
            <div className={`score-value ${currentScore < 60 ? 'poor' : 'good'}`}>
              {currentScore}%
            </div>
          </div>
          <WebcamView />
        </div>

        <div className="side-content-area">
          <div className="notification-section">
            <div className="notification-toggle" onClick={toggleNotifications}>
              {notificationsEnabled ? (
                <IoNotifications className="notification-icon enabled" />
              ) : (
                <IoNotificationsOff className="notification-icon disabled" />
              )}
            </div>
            <p className="notification-status">
              Reminders are currently {notificationsEnabled ? 'enabled' : 'disabled'}
            </p>
            <p className="notification-description">
              You will receive alerts when your posture needs attention
            </p>
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
        </div>
      </div>
    </div>
  )
}

export default Home 