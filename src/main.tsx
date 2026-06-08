import React from 'react'
import ReactDOM from 'react-dom/client'
import { initSentry } from './lib/sentry'

initSentry()
import { BrowserRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Toaster } from 'react-hot-toast'
import { ConfigProvider } from './contexts/ConfigContext'
import { LocalProvider } from './contexts/LocalContext'
import App from './App'
import './index.css'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
})

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <QueryClientProvider client={queryClient}>
        <LocalProvider>
          <ConfigProvider>
            <App />
          </ConfigProvider>
        </LocalProvider>
        <Toaster 
          position="top-right"
          toastOptions={{
            style: {
              background: '#302f39',
              color: '#f3effc',
              borderRadius: '8px',
            },
          }}
        />
      </QueryClientProvider>
    </BrowserRouter>
  </React.StrictMode>,
)
