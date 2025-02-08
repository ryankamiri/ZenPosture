import React from 'react'
import { BiCheckCircle } from 'react-icons/bi'

function ExerciseCard({ exercise, onToggle }) {
  return (
    <div className={`exercise-card ${exercise.completed ? 'completed' : ''}`}>
      <div className="exercise-media">
        <img src={exercise.gif} alt={exercise.title} className="exercise-gif" />
        <div className="exercise-overlay">
          <button 
            className="complete-exercise-btn"
            onClick={onToggle}
          >
            <BiCheckCircle />
            {exercise.completed ? 'Completed' : 'Mark Complete'}
          </button>
        </div>
      </div>
      <div className="exercise-content">
        <h3>{exercise.title}</h3>
        <ol className="exercise-steps">
          {exercise.steps.map((step, index) => (
            <li key={index}>{step}</li>
          ))}
        </ol>
        {exercise.tip && (
          <p className="exercise-tip">
            <strong>Tip:</strong> {exercise.tip}
          </p>
        )}
      </div>
    </div>
  )
}

export default ExerciseCard 