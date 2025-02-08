import React, { useState } from 'react'
import { BrowserRouter as Router, Routes, Route, Link, useLocation } from 'react-router-dom'
import { BiHome, BiInfoCircle, BiLineChart } from 'react-icons/bi'
import Home from './pages/Home'
import About from './pages/About'
import Statistics from './pages/Statistics'
import Exercises from './pages/Exercises'

function NavLink({ to, children, icon }) {
  const location = useLocation()
  const isActive = location.pathname === to

  return (
    <Link to={to} className={`nav-link ${isActive ? 'active' : ''}`}>
      {icon}
      <span className="nav-text">{children}</span>
      {isActive && <div className="nav-indicator" />}
    </Link>
  )
}

function App() {
  return (
    <Router>
      <div className="app-container">
        <nav className="main-nav">
          <div className="nav-brand">
            <h1>Zen Posture</h1>
          </div>
          <div className="nav-links">
            <NavLink to="/" icon={<BiHome className="nav-icon" />}>Home</NavLink>
            <NavLink to="/statistics" icon={<BiLineChart className="nav-icon" />}>Statistics</NavLink>
            <NavLink to="/about" icon={<BiInfoCircle className="nav-icon" />}>About</NavLink>
          </div>
        </nav>
        
        <main className="main-content">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/about" element={<About />} />
            <Route path="/statistics" element={<Statistics />} />
            <Route path="/exercises" element={<Exercises />} />
          </Routes>
        </main>
      </div>
    </Router>
  )
}

export default App

