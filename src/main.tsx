import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { domAnimation, LazyMotion, MotionConfig } from 'motion/react'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { WagmiProvider } from 'wagmi'
import App from './App'
import './index.css'
import { config } from './wagmi'

const queryClient = new QueryClient()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <LazyMotion features={domAnimation} strict>
          <MotionConfig reducedMotion="user">
            <App />
          </MotionConfig>
        </LazyMotion>
      </QueryClientProvider>
    </WagmiProvider>
  </StrictMode>,
)
