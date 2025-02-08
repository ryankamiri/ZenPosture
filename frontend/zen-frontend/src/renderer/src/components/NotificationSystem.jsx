import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Bell } from 'lucide-react'

function NotificationSystem({ enabled }) {
  const navigate = useNavigate()
  const [showNotification, setShowNotification] = useState(false)

  useEffect(() => {
    let interval
    if (enabled) {
      interval = setInterval(() => {
        setShowNotification(true)
        // Play notification sound
        new Audio('/notification-sound.mp3').play().catch(() => {})
        
        // Hide notification after 10 seconds
        setTimeout(() => setShowNotification(false), 10000)
      }, 60 * 60 * 1000) // 60 minutes
    }

    return () => {
      if (interval) clearInterval(interval)
    }
  }, [enabled])

  const handleNotificationClick = () => {
    setShowNotification(false)
    navigate('/exercise')
  }

  if (!showNotification) return null

  return (
    <div className="notification" onClick={handleNotificationClick}>
      <Bell size={24} className="text-primary" />
      <div>
        <h3 className="font-semibold">Time for Exercise!</h3>
        <p className="text-sm text-secondary">Click to start your posture exercises</p>
      </div>
    </div>
  )
}

export default NotificationSystem 