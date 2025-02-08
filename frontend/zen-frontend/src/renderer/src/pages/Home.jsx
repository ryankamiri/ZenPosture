import React, { useState } from 'react'

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
      <h1>Zen Posture</h1>
      <div className="controls">
        <button 
          onClick={toggleNotifications}
          className={`toggle-btn ${notificationsEnabled ? 'active' : ''}`}
        >
          {notificationsEnabled ? 'Disable Notifications' : 'Enable Notifications'}
        </button>
        <button 
          onClick={toggleStats}
          className={`toggle-btn ${showStats ? 'active' : ''}`}
        >
          {showStats ? 'Hide Stats' : 'Show Stats'}
        </button>
      </div>
      {showStats && (
        <div className="quick-stats">
          {/* Quick statistics preview */}
          <p>Today's Progress</p>
          {/* Add quick stats content */}
        </div>
      )}
    </div>
  )
}

export default Home 