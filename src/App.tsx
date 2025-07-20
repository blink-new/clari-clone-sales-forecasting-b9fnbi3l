import { useState, useEffect } from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { blink } from './blink/client'
import { Sidebar } from './components/layout/Sidebar'
import { Header } from './components/layout/Header'
import { Dashboard } from './pages/Dashboard'
import { ForecastSubmission } from './pages/ForecastSubmission'
import { DealManagement } from './pages/DealManagement'
import { ManagerForecast } from './pages/ManagerForecast'
import { Analytics } from './pages/Analytics'
import { SalesforceIntegration } from './pages/SalesforceIntegration'
import { LoadingScreen } from './components/ui/LoadingScreen'

function App() {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const unsubscribe = blink.auth.onAuthStateChanged((state) => {
      setUser(state.user)
      setLoading(state.isLoading)
    })
    return unsubscribe
  }, [])

  if (loading) {
    return <LoadingScreen />
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-semibold text-foreground mb-4">
            Welcome to Sales Forecasting Platform
          </h1>
          <p className="text-muted-foreground mb-6">
            Please sign in to access your dashboard
          </p>
          <button
            onClick={() => blink.auth.login()}
            className="bg-primary text-primary-foreground px-6 py-2 rounded-lg hover:bg-primary/90 transition-colors"
          >
            Sign In
          </button>
        </div>
      </div>
    )
  }

  return (
    <Router>
      <div className="min-h-screen bg-background">
        <div className="flex">
          <Sidebar />
          <div className="flex-1 flex flex-col">
            <Header user={user} />
            <main className="flex-1 p-6">
              <Routes>
                <Route path="/" element={<Navigate to="/dashboard" replace />} />
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/forecast-submission" element={<ForecastSubmission />} />
                <Route path="/deal-management" element={<DealManagement />} />
                <Route path="/manager-forecast" element={<ManagerForecast />} />
                <Route path="/analytics" element={<Analytics />} />
                <Route path="/salesforce" element={<SalesforceIntegration />} />
              </Routes>
            </main>
          </div>
        </div>
      </div>
    </Router>
  )
}

export default App