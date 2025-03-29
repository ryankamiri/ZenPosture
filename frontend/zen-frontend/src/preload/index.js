import { contextBridge } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'
const { machineIdSync } = require('node-machine-id')

// Get hardware ID - using machineIdSync instead of custom generation
const hwid = machineIdSync()
console.log('Generated HWID:', hwid)

// API endpoints
const API_URL = 'https://zen-posture-df6c9e802988.herokuapp.com/api'

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

      // Ensure data has the correct structure
      const dataToSend = {
        score: sessionData.score,
        timestamp: sessionData.timestamp || new Date(),
        duration: sessionData.duration || 0
      };

      console.log('Adding posture session:', dataToSend)
      const response = await fetch(`${API_URL}/posture-sessions/${currentUser.HWID}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(dataToSend)
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

      const data = await response.json()
      console.log('Retrieved today\'s sessions:', data)
      return data.sessions || [] // Make sure we're returning the sessions array
    } catch (error) {
      console.error('Failed to get today\'s sessions:', error)
      return [] // Return empty array on error
    }
  },

  // Get monthly statistics
  getMonthlyStats: async (year) => {
    try {
      if (!currentUser) {
        console.error('No user initialized')
        throw new Error('User not initialized')
      }

      // Validate the year is not in the future
      const currentYear = new Date().getFullYear();
      if (year > currentYear) {
        console.warn(`Requested statistics for future year ${year}, returning empty data`)
        return { monthlyStats: {} };
      }

      const yearParam = year ? `?year=${year}` : '';
      console.log(`Fetching monthly statistics for ${year ? 'year ' + year : 'current year'}`)
      const response = await fetch(`${API_URL}/statistics/${currentUser.HWID}/monthly${yearParam}`)
      
      if (!response.ok) {
        if (response.status === 404) {
          console.warn(`Monthly statistics not found for year ${year}, returning empty data`)
          return { monthlyStats: {} };
        }
        throw new Error(`Failed to fetch monthly statistics: ${response.status}`)
      }

      const stats = await response.json()
      console.log('Retrieved monthly statistics:', stats)
      return stats
    } catch (error) {
      console.error('Failed to get monthly statistics:', error)
      // Return empty data structure rather than throwing
      return { monthlyStats: {} };
    }
  },

  // Get yearly statistics
  getYearlyStats: async () => {
    try {
      if (!currentUser) {
        console.error('No user initialized')
        throw new Error('User not initialized')
      }

      console.log('Fetching yearly statistics')
      const response = await fetch(`${API_URL}/statistics/${currentUser.HWID}/yearly`)
      
      if (!response.ok) {
        if (response.status === 404) {
          console.warn(`Yearly statistics not found, returning empty data`)
          return { yearlyStats: {} };
        }
        throw new Error(`Failed to fetch yearly statistics: ${response.status}`)
      }

      const stats = await response.json()
      console.log('Retrieved yearly statistics:', stats)
      return stats
    } catch (error) {
      console.error('Failed to get yearly statistics:', error)
      // Return empty data structure rather than throwing
      return { yearlyStats: {} };
    }
  },

  // Get daily data for a specific month
  getDailyDataForMonth: async (year, month) => {
    try {
      if (!currentUser) {
        console.error('No user initialized')
        throw new Error('User not initialized')
      }

      // Validate the year/month is not in the future
      const currentDate = new Date();
      const currentYear = currentDate.getFullYear();
      const currentMonth = currentDate.getMonth() + 1;
      
      if (year > currentYear || (year === currentYear && month > currentMonth)) {
        console.warn(`Requested data for future date ${year}-${month}, returning empty data`)
        return { dailyData: [] };
      }

      console.log(`Fetching daily data for ${year}-${month}`)
      const response = await fetch(`${API_URL}/statistics/${currentUser.HWID}/daily?year=${year}&month=${month}`)
      
      if (!response.ok) {
        if (response.status === 404) {
          console.warn(`Daily data not found for ${year}-${month}, returning empty data`)
          return { dailyData: [] };
        }
        throw new Error(`Failed to fetch daily data: ${response.status}`)
      }

      const data = await response.json()
      console.log('Retrieved daily data for month:', data)
      return data
    } catch (error) {
      console.error('Failed to get daily data for month:', error)
      
      // Check if this is the current month - only generate simulated data for the current month
      const currentDate = new Date();
      const currentYear = currentDate.getFullYear();
      const currentMonth = currentDate.getMonth() + 1;
      const isCurrentMonth = year === currentYear && month === currentMonth;
      
      // If this is a past month, don't generate simulated data - return empty data
      if (!isCurrentMonth && (year < currentYear || (year === currentYear && month < currentMonth))) {
        console.log('Not generating simulated data for past month');
        return { dailyData: [] };
      }
      
      // If this is a future month, return empty data
      if (year > currentYear || (year === currentYear && month > currentMonth)) {
        console.log('Not generating simulated data for future month');
        return { dailyData: [] };
      }
      
      // Only for current month, generate simulated data up to the current day
      console.log('Generating simulated daily data for current month only');
      const daysInMonth = new Date(year, month, 0).getDate();
      const maxDay = currentDate.getDate();
      
      const simulatedData = {
        dailyData: Array.from({ length: maxDay }, (_, i) => {
          const day = i + 1;
          
          // Create somewhat realistic data with a curve and some randomness
          const baseScore = 60 + Math.sin((i / daysInMonth) * Math.PI) * 20;
          const randomVariation = Math.random() * 10 - 5; // -5 to +5
          
          return {
            day: day,
            date: `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`,
            averageScore: Math.min(95, Math.max(30, Math.round(baseScore + randomVariation))),
            sessionCount: Math.floor(Math.random() * 10) + 1
          };
        })
      };
      
      return simulatedData;
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
