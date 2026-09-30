import { createConfig, http } from 'wagmi'
import { base, mainnet } from 'wagmi/chains'
import { injected } from 'wagmi/connectors'

// Base holds the stock tokens. Mainnet is only used to resolve ENS names.
// Override the RPC endpoints at build time with VITE_BASE_RPC / VITE_MAINNET_RPC.
export const config = createConfig({
  chains: [base, mainnet],
  // Wallets announce themselves via EIP-6963, so MetaMask, Rabby, etc. show up
  // as separate connectors. injected() is the fallback for older wallets.
  connectors: [injected()],
  transports: {
    [base.id]: http(import.meta.env.VITE_BASE_RPC || 'https://base-rpc.publicnode.com'),
    [mainnet.id]: http(import.meta.env.VITE_MAINNET_RPC || 'https://ethereum-rpc.publicnode.com'),
  },
})
