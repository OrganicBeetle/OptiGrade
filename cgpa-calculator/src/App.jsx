import { BrowserRouter as Router, Routes, Route } from "react-router-dom"
import ProtectedRoute from "./components/ProtectedRoute"
import TargetPlanner from "./pages/TargetPlanner"
import Leaderboard from "./pages/Leaderboard"
import Signup from "./pages/signup"
import HomePage from "./pages/homepage"

const App = () => {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Signup />} />
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <HomePage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/planner"
          element={
            <ProtectedRoute>
              <TargetPlanner />
            </ProtectedRoute>
          }
        />
        <Route
          path="/leaderboard"
          element={
            <ProtectedRoute>
              <Leaderboard />
            </ProtectedRoute>
          }
        />
      </Routes>
    </Router>
  )
}

export default App
