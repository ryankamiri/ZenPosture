import React from 'react'
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom'
import Home from './pages/Home'
import About from './pages/About'
import Statistics from './pages/Statistics'
import Exercises from './pages/Exercises'

function App() {
  return (
    <Router>
      <div className="app-container">
        <nav className="main-nav">
          <div className="nav-brand">
            <h1>Zen Posture</h1>
          </div>
          <div className="nav-links">
            <Link to="/" className="nav-link">Home</Link>
            <Link to="/statistics" className="nav-link">Statistics</Link>
            <Link to="/about" className="nav-link">About</Link>
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

