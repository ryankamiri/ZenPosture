import { contextBridge } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'
const { machineIdSync } = require('node-machine-id')

// Get hardware ID - using machineIdSync instead of custom generation
const hwid = machineIdSync()
console.log('Generated HWID:', hwid)

// API endpoints
const API_URL = 'http://localhost:5001/api'

// User state
let currentUser = null

const userAPI = {
  // Initialize or get user
  initUser: async () => {
    try {
      console.log('Attempting to initialize user with HWID:', hwid)
      const response = await fetch(`${API_URL}/users/init`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ hwid })
      })

      if (!response.ok) {
        throw new Error(`Server responded with status: ${response.status}`)
      }

      currentUser = await response.json()
      console.log('User initialized successfully:', currentUser)
      return currentUser
    } catch (error) {
      console.error('Failed to initialize user:', error)
      throw error
    }
  },

  // Add posture session
  addPostureSession: async (sessionData) => {
    try {
      if (!currentUser) {
        console.error('No user initialized')
        throw new Error('User not initialized')
      }

      console.log('Adding posture session:', sessionData)
      const response = await fetch(`${API_URL}/posture-sessions/${currentUser.HWID}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(sessionData)
      })

      if (!response.ok) {
        throw new Error(`Failed to add session: ${response.status}`)
      }

      console.log('Posture session added successfully')
    } catch (error) {
      console.error('Failed to add posture session:', error)
      throw error
    }
  },

  // Get today's sessions
  getTodaySessions: async () => {
    try {
      if (!currentUser) {
        console.error('No user initialized')
        throw new Error('User not initialized')
      }

      console.log('Fetching today\'s sessions')
      const response = await fetch(`${API_URL}/posture-sessions/${currentUser.HWID}`)
      
      if (!response.ok) {
        throw new Error(`Failed to fetch sessions: ${response.status}`)
      }

      const sessions = await response.json()
      console.log('Retrieved today\'s sessions:', sessions)
      return sessions
    } catch (error) {
      console.error('Failed to get today\'s sessions:', error)
      throw error
    }
  },

  // Get current user
  getCurrentUser: () => {
    if (!currentUser) {
      console.warn('getCurrentUser called but no user is initialized')
    }
    return currentUser
  }
}

// Use contextBridge to expose APIs to renderer
contextBridge.exposeInMainWorld('electron', electronAPI)
contextBridge.exposeInMainWorld('api', userAPI)
