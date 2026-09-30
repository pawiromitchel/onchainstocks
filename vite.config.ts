import react from '@vitejs/plugin-react'
import { defineConfig, type Plugin } from 'vite'
import { quoteUrls } from './src/lib/dexscreener.ts'
import stocks from './src/stocks.json' with { type: 'json' }

// Every screen shows prices. Starting their requests from the HTML means they run while the app's
// JavaScript downloads instead of after it (~1.5 s earlier on a slow phone). useQuotes picks them up.
function prefetchQuotes(): Plugin {
  const urls = JSON.stringify(quoteUrls(stocks.map((s) => s.address)))
  const code = `window.__quotes=Promise.all(${urls}.map(function(u){return fetch(u).then(function(r){if(!r.ok)throw new Error('Price API returned '+r.status);return r.json()})}));window.__quotes.catch(function(){});`
  return {
    name: 'prefetch-quotes',
    transformIndexHtml: () => [{ tag: 'script', children: code, injectTo: 'head-prepend' }],
  }
}

// Libraries change far less often than app code, so they get their own long-cached chunks:
// after a deploy, returning visitors only re-download the small app chunk.
const vendor = (name: string, pkgs: string[], priority: number) => ({
  name,
  test: new RegExp(`node_modules[\\\\/](${pkgs.join('|')})[\\\\/]`),
  priority,
})

const LAZY_ENS = /node_modules[\\/](@adraffy[\\/]|ox[\\/]_esm[\\/]core[\\/]Ens\.js|viem[\\/]_esm[\\/](ens[\\/]index|utils[\\/]ens[\\/]normalize)\.js)/

// Relative base + hash routing lets the build run from any path, e.g. github.io/onchainstocks/
export default defineConfig({
  base: './',
  plugins: [react(), prefetchQuotes()],
  build: {
    rolldownOptions: {
      output: {
        codeSplitting: {
          groups: [
            vendor('react', ['react', 'react-dom', 'scheduler'], 30),
            vendor('motion', ['motion', 'framer-motion', 'motion-dom', 'motion-utils'], 20),
            // Everything else from npm: wagmi, viem and their helpers, TanStack Query. The ENS
            // normalizer and the modules that import it stay out, so they form an on-demand chunk
            // (see App.tsx). If these internal paths move, it just lands back in this chunk.
            { name: 'web3', test: (id: string) => /node_modules[\\/]/.test(id) && !LAZY_ENS.test(id), priority: 10 },
          ],
        },
      },
    },
  },
})
