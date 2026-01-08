import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

const AuthContext = createContext({})

export const useAuth = () => useContext(AuthContext)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let isMounted = true

    const initializeAuth = async () => {
      try {
        // Get current session
        const { data: { session }, error: sessionError } = await supabase.auth.getSession()
        
        if (sessionError) {
          console.error('Session error:', sessionError)
          if (isMounted) {
            setUser(null)
            setProfile(null)
            setLoading(false)
          }
          return
        }

        if (session?.user) {
          if (isMounted) {
            setUser(session.user)
          }
          
          // Fetch profile with timeout
          const profileData = await fetchProfileWithTimeout(session.user.id)
          
          if (isMounted) {
            setProfile(profileData)
            setLoading(false)
          }
        } else {
          if (isMounted) {
            setUser(null)
            setProfile(null)
            setLoading(false)
          }
        }
      } catch (error) {
        console.error('Auth initialization error:', error)
        if (isMounted) {
          setUser(null)
          setProfile(null)
          setLoading(false)
        }
      }
    }

    initializeAuth()

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('Auth state changed:', event)
        
        if (event === 'SIGNED_OUT') {
          if (isMounted) {
            setUser(null)
            setProfile(null)
            setLoading(false)
          }
          return
        }

        if (session?.user) {
          if (isMounted) {
            setUser(session.user)
          }
          
          const profileData = await fetchProfileWithTimeout(session.user.id)
          
          if (isMounted) {
            setProfile(profileData)
            setLoading(false)
          }
        } else {
          if (isMounted) {
            setUser(null)
            setProfile(null)
            setLoading(false)
          }
        }
      }
    )

    return () => {
      isMounted = false
      subscription.unsubscribe()
    }
  }, [])

  // Fetch profile with a timeout to prevent hanging
  const fetchProfileWithTimeout = async (userId) => {
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Profile fetch timeout')), 3000)
    })

    const fetchPromise = async () => {
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', userId)
          .single()

        if (error) {
          console.error('Profile fetch error:', error)
          return null
        }
        return data
      } catch (err) {
        console.error('Profile fetch exception:', err)
        return null
      }
    }

    try {
      return await Promise.race([fetchPromise(), timeoutPromise])
    } catch (error) {
      console.error('Profile fetch failed:', error.message)
      return null
    }
  }

  const signIn = async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })
    return { data, error }
  }

  const signUp = async (email, password, metadata = {}) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: metadata,
      },
    })
    return { data, error }
  }

  const signOut = async () => {
    const { error } = await supabase.auth.signOut()
    if (!error) {
      setUser(null)
      setProfile(null)
    }
    return { error }
  }

  const value = {
    user,
    profile,
    loading,
    signIn,
    signUp,
    signOut,
    isTrainer: profile?.role === 'trainer' || profile?.role === 'manager',
    isManager: profile?.role === 'manager',
    isLearner: profile?.role === 'learner',
    isAdmin: profile?.role === 'admin',
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}
