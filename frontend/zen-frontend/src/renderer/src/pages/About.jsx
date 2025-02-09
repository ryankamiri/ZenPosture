import React from 'react'
import { BiBody, BiTime, BiNotification, BiLineChart } from 'react-icons/bi'
import { FiGithub } from 'react-icons/fi'

function About() {
  const features = [
    {
      icon: <BiBody />,
      title: 'Posture Detection',
      description: 'Real-time posture monitoring using your webcam to help maintain good posture'
    },
    {
      icon: <BiNotification />,
      title: 'Smart Reminders',
      description: 'Customizable notifications to remind you to check and correct your posture'
    },
    {
      icon: <BiTime />,
      title: 'Exercise Routines',
      description: 'Guided exercises every hour to help prevent muscle strain and fatigue'
    },
    {
      icon: <BiLineChart />,
      title: 'Progress Tracking',
      description: 'Detailed statistics and insights about your posture improvement journey'
    }
  ]

  return (
    <div className="about-container">
      <div className="about-header">
        <h1>About Zen Posture</h1>
        <p className="about-subtitle">
          Your AI-powered posture companion for a healthier work lifestyle
        </p>
      </div>

      <div className="about-content">
        <div className="about-section">
          <h2>Our Mission</h2>
          <p>
            Zen Posture is designed to help professionals maintain good posture during long work hours.
            Using advanced computer vision, we provide real-time feedback and personalized recommendations
            to prevent posture-related health issues.
          </p>
        </div>

        <div className="features-grid">
          {features.map((feature, index) => (
            <div key={index} className="feature-card">
              <div className="feature-icon">
                {feature.icon}
              </div>
              <h3>{feature.title}</h3>
              <p>{feature.description}</p>
            </div>
          ))}
        </div>

        <div className="about-section">
          <h2>Open Source</h2>
          <p>
            Zen Posture is an open-source project, built with modern technologies to ensure
            privacy and transparency. We believe in creating tools that respect user privacy
            while providing valuable health benefits.
          </p>
          <a href="https://github.com/ryankamiri/ZenPosture" className="github-link">
            <FiGithub /> View on GitHub
          </a>
        </div>

        <div className="about-footer">
          <p>Version 1.0.0</p>
          <p>Made with ❤️ for better posture</p>
        </div>
      </div>
    </div>
  )
}

export default About 