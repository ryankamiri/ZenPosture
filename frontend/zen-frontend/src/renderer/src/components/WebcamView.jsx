import React, { useRef, useState } from 'react'
import Webcam from 'react-webcam'
import { BiCamera, BiReset } from 'react-icons/bi'
import ThemeToggle from './ThemeToggle'

function WebcamView() {
  const webcamRef = useRef(null)
  const [isMinimized, setIsMinimized] = useState(false)

  const toggleMinimize = () => {
    setIsMinimized(!isMinimized)
  }

  return (
    <div className={`webcam-container ${isMinimized ? 'minimized' : ''}`}>
      <div className="webcam-header">
        <h3>Posture View</h3>
        <div className="webcam-controls">
          <ThemeToggle />
          <button className="webcam-toggle" onClick={toggleMinimize}>
            {isMinimized ? <BiCamera /> : <BiReset />}
          </button>
        </div>
      </div>
      <div className="webcam-content">
        <Webcam
          ref={webcamRef}
          mirrored={true}
          audio={false}
          screenshotFormat="image/jpeg"
          className="webcam-view"
        />
        <div className="webcam-overlay">
        </div>
      </div>
    </div>
  )
}

export default WebcamView 