// src/components/ProtectedRoute.jsx
import { useEffect, useState } from "react"
import { Navigate } from "react-router-dom"
import { onAuthStateChanged } from "firebase/auth"
import { auth } from "../utils/firebase"

const ProtectedRoute = ({ children }) => {
  const [user, setUser] = useState(undefined)

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currUser) => {
      setUser(currUser || null)
    })
    return () => unsubscribe()
  }, [])

  if (user === undefined) return null // or loading spinner

  return user ? children : <Navigate to="/" replace />
}

export default ProtectedRoute
