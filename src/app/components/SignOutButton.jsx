'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

export default function SignOutButton() {
  const [isSignedIn, setIsSignedIn] = useState(false)
  const [isBootstrapping, setIsBootstrapping] = useState(true)
  const router = useRouter()

  useEffect(() => {
    try {
      const stored = localStorage.getItem('user')
      console.log('Checking stored user:', stored)
      setIsSignedIn(Boolean(stored))
    } catch (_) {
      setIsSignedIn(false)
    } finally {
      setIsBootstrapping(false)
    }
  }, [])

  const handleSignOut = () => {
    try {
      console.log('Starting sign out process...')
      
      const userBefore = localStorage.getItem('user')
      console.log('User data before removal:', userBefore)

      localStorage.removeItem('user')
      
      const userAfter = localStorage.getItem('user')
      console.log('User data after removal:', userAfter)
      
      sessionStorage.clear()
      console.log('Session storage cleared')
      
      document.cookie.split(";").forEach(function(c) { 
        document.cookie = c.replace(/^ +/, "").replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/"); 
      })
      console.log('Cookies cleared')
      
      setIsSignedIn(false)
      console.log('Local state updated to signed out')
      
      console.log('Redirecting to signin page...')
      window.location.href = '/signin'
    } catch (error) {
      console.error('Error during sign out:', error)
      router.replace('/signin')
    }
  }

  if (isBootstrapping || !isSignedIn) return null

  return (
    <button
      onClick={handleSignOut}
      className="inline-flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-md text-sm font-medium shadow"
      aria-label="Sign out"
    >
      Sign out
    </button>
  )
}