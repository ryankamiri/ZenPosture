import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import ExerciseCard from '../components/ExerciseCard'
import { BiCheckCircle, BiReset } from 'react-icons/bi'

const initialExercises = [
  {
    id: 'triceps',
    title: 'Triceps Stretch',
    gif: '/400x400_Stretches_to_Do_at_Work_Every_Day_Triceps_Stretch.gif',
    steps: [
      'Raise your arm and bend it so that your hand reaches toward the opposite side',
      'Use your other hand and pull the elbow toward your head',
      'Hold for 10 to 30 seconds',
      'Repeat on the other side'
    ],
    completed: false
  },
  {
    id: 'overhead',
    title: 'Overhead Reach (Latissimus Stretch)',
    gif: '/400x400_Stretches_to_Do_at_Work_Every_Day_Overhead_Reach.gif',
    steps: [
      'Extend each arm overhead',
      'Reach to the opposite side',
      'Hold for 10 to 30 seconds',
      'Repeat on the other side'
    ],
    completed: false
  },
  {
    id: 'upper-body',
    title: 'Upper Body and Arm Stretch',
    gif: '/400x400_Stretches_to_Do_at_Work_Every_Day_Upper_Body_Stretch.gif',
    steps: [
      'Clasp hands together above the head with palms facing outward',
      'Push your arms up, stretching upward',
      'Hold the pose for 10 to 30 seconds'
    ],
    completed: false
  },
  {
    id: 'shoulder',
    title: 'Shoulder (Pectoralis) Stretch',
    gif: '/400x400_Stretches_to_Do_at_Work_Every_Day_Shoulder_Pec_Stretch.gif',
    steps: [
      'Clasp hands behind your back',
      'Push the chest outward, and raise the chin',
      'Hold the pose for 10 to 30 seconds'
    ],
    completed: false
  },
  {
    id: 'forward',
    title: 'Forward Stretch',
    gif: '/400x400_Stretches_to_Do_at_Work_Every_Day_Forward_Stretch.gif',
    steps: [
      'Clasp your hands in front of you and lower your head in line with your arms',
      'Press forward and hold for 10 to 30 seconds'
    ],
    completed: false
  },
  {
    id: 'torso',
    title: 'Torso Stretch',
    gif: '/400x400_Stretches_to_Do_at_Work_Every_Day_Torso_Stretch.gif',
    steps: [
      'Keep your feet firmly on the ground, facing forward',
      'Twist your upper body in the direction of the arm that\'s resting on the back of your chair',
      'Hold pose for 10 to 30 seconds',
      'Repeat on other side'
    ],
    tip: 'Exhale as you lean into the stretch for a greater range of motion',
    completed: false
  }
]

function Exercises() {
  const navigate = useNavigate()
  const [exercises, setExercises] = useState(() => {
    const saved = localStorage.getItem('exercises')
    return saved ? JSON.parse(saved) : initialExercises
  })

  const [showCompleted, setShowCompleted] = useState(true)

  useEffect(() => {
    localStorage.setItem('exercises', JSON.stringify(exercises))
    
    // Check if all exercises are completed
    const allCompleted = exercises.every(ex => ex.completed)
    if (allCompleted) {
      // Wait a moment to show all completed, then reset and navigate
      setTimeout(() => {
        setExercises(exercises.map(exercise => ({ ...exercise, completed: false })))
        navigate('/')
      }, 1500) // 1.5 second delay
    }
  }, [exercises, navigate])

  const toggleExercise = (id) => {
    setExercises(exercises.map(exercise => 
      exercise.id === id 
        ? { ...exercise, completed: !exercise.completed }
        : exercise
    ))
  }

  const resetExercises = () => {
    setExercises(exercises.map(exercise => ({ ...exercise, completed: false })))
  }

  const completedCount = exercises.filter(ex => ex.completed).length
  const totalExercises = exercises.length

  const filteredExercises = showCompleted 
    ? exercises 
    : exercises.filter(ex => !ex.completed)

  return (
    <div className="exercises-container">
      <div className="exercises-header">
        <h1>Daily Stretches</h1>
        <p>Simple exercises to maintain good posture throughout your workday</p>
        
        <div className="exercises-progress">
          <div className="progress-stats">
            <BiCheckCircle className="progress-icon" />
            <span>{completedCount} of {totalExercises} completed</span>
          </div>
          <div className="progress-actions">
            <button 
              className="toggle-completed-btn"
              onClick={() => setShowCompleted(!showCompleted)}
            >
              {showCompleted ? 'Hide Completed' : 'Show All'}
            </button>
            <button 
              className="reset-exercises-btn"
              onClick={resetExercises}
            >
              <BiReset /> Reset All
            </button>
          </div>
        </div>
      </div>

      <div className="exercises-grid">
        {filteredExercises.map((exercise) => (
          <ExerciseCard 
            key={exercise.id} 
            exercise={exercise}
            onToggle={() => toggleExercise(exercise.id)}
          />
        ))}
      </div>
    </div>
  )
}

export default Exercises 