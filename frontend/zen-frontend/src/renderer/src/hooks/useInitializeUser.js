import { useState, useEffect } from 'react'

export function useInitializeUser() {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    async function initUser() {
      try {
        console.log('Starting user initialization')
        const userData = await window.api.initUser()
        console.log('User initialized:', userData)
        setUser(userData)
      } catch (err) {
        console.error('Error initializing user:', err)
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }

    initUser()
  }, [])

  return { user, loading, error }
} 