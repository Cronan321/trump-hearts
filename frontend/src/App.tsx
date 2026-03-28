import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom'
import LoginPage from './pages/LoginPage'
import RegisterPage from './pages/RegisterPage'
import LobbyPage from './pages/LobbyPage'
import GameTablePage from './pages/GameTablePage'
import WaitingRoomPage from './pages/WaitingRoomPage'
import PrivacyPolicyPage from './pages/PrivacyPolicyPage'
import TermsOfUsePage from './pages/TermsOfUsePage'
import HelpFAQPage from './pages/HelpFAQPage'
import AboutPage from './pages/AboutPage'
import ContactPage from './pages/ContactPage'
import CookiePolicyPage from './pages/CookiePolicyPage'
import { PrivateRoute, SiteFooter } from './components'

function Layout() {
  return (
    <div className="min-h-screen flex flex-col">
      <div className="flex-1">
        <Outlet />
      </div>
      <SiteFooter />
    </div>
  )
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<Navigate to="/lobby" replace />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />

          {/* Public static pages */}
          <Route path="/privacy" element={<PrivacyPolicyPage />} />
          <Route path="/terms" element={<TermsOfUsePage />} />
          <Route path="/help" element={<HelpFAQPage />} />
          <Route path="/about" element={<AboutPage />} />
          <Route path="/contact" element={<ContactPage />} />
          <Route path="/cookies" element={<CookiePolicyPage />} />

          {/* Protected routes */}
          <Route element={<PrivateRoute />}>
            <Route path="/lobby" element={<LobbyPage />} />
            <Route path="/table/:tableId/waiting" element={<WaitingRoomPage />} />
            <Route path="/table/:tableId" element={<GameTablePage />} />
          </Route>
        </Route>
      </Routes>
    </BrowserRouter>
  )
}

export default App

