import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'
import { AuthProvider } from './context/AuthContext.jsx'
import { DataProvider } from './context/DataContext.jsx'
import { ToastProvider } from './components/Toast.jsx'
import { AgentProvider } from './context/AgentContext.jsx'
import { GuestProvider } from './context/GuestContext.jsx'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
      <ToastProvider>
        <AuthProvider>
          <GuestProvider>
            <DataProvider>
              <AgentProvider>
                <App />
              </AgentProvider>
            </DataProvider>
          </GuestProvider>
        </AuthProvider>
      </ToastProvider>
  </React.StrictMode>,
)
