import { motion } from 'framer-motion'
import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { CheckCircle, Clock, ArrowRight } from 'lucide-react'

function Exercise() {
  const navigate = useNavigate()
  const [currentExercise, setCurrentExercise] = useState(0)
  const [timer, setTimer] = useState(30) // 30 seconds per exercise

  const exercises = [
    {
      title: 'Neck Stretches',
      description: 'Gently tilt your head to each side, holding for 10 seconds',
      duration: 30,
    },
    {
      title: 'Shoulder Rolls',
      description: 'Roll your shoulders backwards and forwards',
      duration: 30,
    },
    {
      title: 'Back Stretches',
      description: 'Stand up and gently bend backwards, supporting your lower back',
      duration: 30,
    }
  ]

  useEffect(() => {
    if (timer > 0) {
      const countdown = setInterval(() => setTimer(t => t - 1), 1000)
      return () => clearInterval(countdown)
    } else if (currentExercise < exercises.length - 1) {
      setCurrentExercise(c => c + 1)
      setTimer(30)
    }
  }, [timer, currentExercise])

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.1 }
    }
  }

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
      transition: { type: "spring", stiffness: 300, damping: 30 }
    }
  }

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="max-w-3xl mx-auto"
    >
      <motion.h1 className="page-title">Exercise Time</motion.h1>
      <motion.p className="page-subtitle">
        Follow along with these exercises to improve your posture
      </motion.p>

      <motion.div variants={itemVariants} className="exercise-card">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold">
            {exercises[currentExercise].title}
          </h2>
          <span className="text-sm text-secondary">
            {currentExercise + 1}/{exercises.length}
          </span>
        </div>

        <p className="text-secondary">
          {exercises[currentExercise].description}
        </p>

        <div className="timer">
          <Clock className="inline-block mr-2" />
          {timer}s
        </div>

        {currentExercise === exercises.length - 1 && timer === 0 ? (
          <button 
            className="button"
            onClick={() => navigate('/')}
          >
            Complete Exercises <CheckCircle size={20} />
          </button>
        ) : (
          <button 
            className="button secondary"
            onClick={() => {
              if (currentExercise < exercises.length - 1) {
                setCurrentExercise(c => c + 1)
                setTimer(30)
              }
            }}
          >
            Skip Exercise <ArrowRight size={20} />
          </button>
        )}
      </motion.div>
    </motion.div>
  )
}

export default Exercise 