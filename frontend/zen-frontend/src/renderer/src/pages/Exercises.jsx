import React from 'react'
import { useNavigate } from 'react-router-dom'

function Exercises() {
  const navigate = useNavigate()

  const handleComplete = () => {
    // TODO: Add logic to record exercise completion
    navigate('/')
  }

  return (
    <div className="exercises-container">
      <h1>Posture Exercises</h1>
      <div className="exercise-list">
        <div className="exercise-item">
          <h2>Shoulder Rolls</h2>
          <p>Roll your shoulders backwards and down 10 times</p>
        </div>
        <div className="exercise-item">
          <h2>Neck Stretches</h2>
          <p>Gently tilt your head to each side for 10 seconds</p>
        </div>
        <div className="exercise-item">
          <h2>Spine Alignment</h2>
          <p>Stand against a wall for 30 seconds maintaining natural spine curve</p>
        </div>
        <button 
          className="complete-btn"
          onClick={handleComplete}
        >
          Complete Exercises
        </button>
      </div>
    </div>
  )
}

export default Exercises 