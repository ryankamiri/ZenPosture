import React, { useState } from 'react'
import { IoNotifications, IoNotificationsOff } from 'react-icons/io5'
import { BiBody } from 'react-icons/bi'
import { FiActivity, FiClock, FiCheckCircle } from 'react-icons/fi'
import WebcamView from '../components/WebcamView'

function Home() {
  const [notificationsEnabled, setNotificationsEnabled] = useState(true)
  const [showStats, setShowStats] = useState(false)

  const toggleNotifications = () => {
    setNotificationsEnabled(!notificationsEnabled)
    // TODO: Implement notification toggle logic
  }

  const toggleStats = () => {
    setShowStats(!showStats)
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