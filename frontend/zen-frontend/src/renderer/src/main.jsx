import './assets/main.css'

import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'

// Initialize theme from localStorage
const initializeTheme = () => {
  const savedTheme = localStorage.getItem('theme')
  if (savedTheme === 'light') {
    document.documentElement.classList.add('light-theme')
  }
}

// Run theme initialization before rendering the app
initializeTheme()

ReactDOM.createRoot(document.getElementById('root')).render(
  <App />
)
