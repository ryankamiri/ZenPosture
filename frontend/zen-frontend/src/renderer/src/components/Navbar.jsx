import { NavLink } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Home, BarChart2, Info } from 'lucide-react'

function Navbar() {
  return (
    <motion.nav 
      className="nav-container"
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.5 }}
    >
      <div className="nav-content">
        <NavLink to="/" className="nav-brand">
          Zen Posture
        </NavLink>
        
        <div className="nav-links">
          <NavLink
            to="/"
            className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
          >
            <Home size={18} />
            <span>Home</span>
          </NavLink>
          
          <NavLink
            to="/statistics"
            className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
          >
            <BarChart2 size={18} />
            <span>Statistics</span>
          </NavLink>
          
          <NavLink
            to="/about"
            className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
          >
            <Info size={18} />
            <span>About</span>
          </NavLink>
        </div>
      </div>
    </motion.nav>
  )
}

export default Navbar 