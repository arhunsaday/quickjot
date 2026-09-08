import './styles/global.css'

import { ThemeProvider } from 'next-themes'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { Toaster } from '@/components/ui/sonner'
import { TooltipProvider } from '@/components/ui/tooltip'
import App from './App'
import { ErrorBoundary } from './components/ErrorBoundary'

const container = document.getElementById('root')
if (!container) throw new Error('Root container missing from index.html')

createRoot(container).render(
  <StrictMode>
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
      <TooltipProvider delayDuration={400}>
        <ErrorBoundary>
          <App />
        </ErrorBoundary>
        <Toaster position="bottom-center" />
      </TooltipProvider>
    </ThemeProvider>
  </StrictMode>,
)
