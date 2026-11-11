import { Routes, Route, useLocation, Navigate, HashRouter } from 'react-router-dom'
import { AnimatePresence, MotionConfig, motion } from 'framer-motion'
import { useEffect } from 'react'
import Landing from './pages/Landing.jsx'
import Login from './pages/Login.jsx'
import Signup from './pages/Signup.jsx'
import ForgotPassword from './pages/ForgotPassword.jsx'
import StudentLayout from './pages/student/StudentLayout.jsx'
import StudentDashboard from './pages/student/StudentDashboard.jsx'
import Print from './pages/student/Print.jsx'
import Assistant from './pages/student/Assistant.jsx'
import Agent from './pages/student/Agent.jsx'
import AiSettings from './pages/student/AiSettings.jsx'
import Notes from './pages/student/Notes.jsx'
import PdfEditor from './pages/student/PdfEditor.jsx'
import Documents from './pages/student/Documents.jsx'
import Orders from './pages/student/Orders.jsx'
import Profile from './pages/student/Profile.jsx'
import ShopLayout from './pages/shop/ShopLayout.jsx'
import ShopDashboard from './pages/shop/ShopDashboard.jsx'
import ShopOrders from './pages/shop/ShopOrders.jsx'
import ShopQueue from './pages/shop/ShopQueue.jsx'
import ShopPricing from './pages/shop/ShopPricing.jsx'
import ShopAnalytics from './pages/shop/ShopAnalytics.jsx'
import ShopSettings from './pages/shop/ShopSettings.jsx'
import ShopScan from './pages/ShopScan.jsx'
import GuestPrint from './pages/GuestPrint.jsx'
import GuestOrders from './pages/GuestOrders.jsx'
import PrintBuddy from './components/PrintBuddy.jsx'
import { useAuth } from './context/AuthContext.jsx'
import { RequireAuth } from './components/Guards.jsx'

function ScrollTop() {
  const { pathname } = useLocation()
  useEffect(() => { window.scrollTo({ top: 0, behavior: 'instant' }) }, [pathname])
  return null
}

function Shell() {
  const location = useLocation()
  const { ready } = useAuth()
  if (!ready) {
    return <div className="min-h-screen grid place-items-center"><div className="h-10 w-10 rounded-full border-2 border-electric-400/30 border-t-electric-400 animate-spin" /></div>
  }
  return (
    <MotionConfig reducedMotion="user">
      <ScrollTop />
      <AnimatePresence mode="wait">
        <motion.div key={location.pathname} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.22 }}>
          <Routes location={location}>
            <Route path="/" element={<Landing />} />
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/shop/:shopId" element={<ShopScan />} />
            <Route path="/print" element={<GuestPrint />} />
            <Route path="/orders" element={<GuestOrders />} />

            <Route path="/app" element={<RequireAuth role="student"><StudentLayout /></RequireAuth>}>
              <Route index element={<StudentDashboard />} />
              <Route path="print" element={<Print />} />
              <Route path="assistant" element={<Assistant />} />
              <Route path="assistant/:id" element={<Assistant />} />
              <Route path="agent" element={<Agent />} />
              <Route path="ai-settings" element={<AiSettings />} />
              <Route path="notes" element={<Notes />} />
              <Route path="pdf-editor" element={<PdfEditor />} />
              <Route path="documents" element={<Documents />} />
              <Route path="orders" element={<Orders />} />
              <Route path="profile" element={<Profile />} />
            </Route>

            <Route path="/shop-owner" element={<RequireAuth role="shop"><ShopLayout /></RequireAuth>}>
              <Route index element={<ShopDashboard />} />
              <Route path="orders" element={<ShopOrders />} />
              <Route path="queue" element={<ShopQueue />} />
              <Route path="pricing" element={<ShopPricing />} />
              <Route path="analytics" element={<ShopAnalytics />} />
              <Route path="settings" element={<ShopSettings />} />
            </Route>

            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </motion.div>
      </AnimatePresence>
      <PrintBuddy />
    </MotionConfig>
  )
}

export default function App() {
  return (
    <HashRouter>
      <Shell />
    </HashRouter>
  )
}
