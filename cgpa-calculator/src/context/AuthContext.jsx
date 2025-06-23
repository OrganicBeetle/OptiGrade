// src/context/AuthContext.js
import { createContext, useContext, useEffect, useState } from "react"
import { auth } from "../utils/firebase"
import { onAuthStateChanged } from "firebase/auth"

const AuthContext = createContext()

export const useAuth = () => useContext(AuthContext)

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null)

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (curr) => setUser(curr))
    return () => unsub()
  }, [])

  return (
    <AuthContext.Provider value={{ user }}>
      {children}
    </AuthContext.Provider>
  )
}
