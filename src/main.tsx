import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { QueryClientProvider } from '@tanstack/react-query'
import { BrowserRouter } from 'react-router-dom'
import './index.css'
import './styles/westgate.css'
import App from './App.tsx'
import { queryClient } from './lib/queryClient'
import { captureMarketingData } from './lib/marketing' // adjust path to where marketing.ts lives

// Save UTM / cid values from the landing URL before the app (and routing) starts
captureMarketingData()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter basename={import.meta.env.BASE_URL}>
        <App />
      </BrowserRouter>
    </QueryClientProvider>
  </StrictMode>,
)