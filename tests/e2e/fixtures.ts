import { readFileSync } from 'node:fs'
import { test as base, type Page, type Route } from '@playwright/test'
import {
  decodeFunctionData,
  encodeAbiParameters,
  encodeFunctionResult,
  erc20Abi,
  multicall3Abi,
  parseUnits,
  type Hex,
} from 'viem'

type StockRow = { symbol: string; address: string; decimals: number }
export const STOCKS: StockRow[] = JSON.parse(
  readFileSync(new URL('../../src/stocks.json', import.meta.url), 'utf8'),
)
export const stock = (symbol: string) => STOCKS.find((s) => s.symbol === symbol)!

export const WALLET = '0x1234567890123456789012345678901234567890'
export const EMPTY_WALLET = '0x000000000000000000000000000000000000dEaD'
export const short = (a: string) => `${a.slice(0, 6)}…${a.slice(-4)}`

// What the fake wallet "holds", the prices DexScreener "returns", and the maths that follows.
export const HOLDINGS: Record<string, number> = { NVDAc: 1.5, AAPLc: 2, TSLAc: 0.25 }
const PRICE: Record<string, number> = { NVDAc: 200, AAPLc: 300, TSLAc: 400 }
const CHANGE: Record<string, number> = { NVDAc: 2, AAPLc: -1, TSLAc: 0.5 }
const NO_POOL = new Set(['WENc', 'BIRDc'])
const THIN = new Set(['TSLAc'])
export const EXPECTED_TOTAL = '$1,000.00' // 1.5*200 + 2*300 + 0.25*400
export const HELD_ORDER = ['AAPLc', 'NVDAc', 'TSLAc'] // by value: 600, 300, 100
export const BUYABLE_COUNT = STOCKS.length - Object.keys(HOLDINGS).length - NO_POOL.size

const MULTICALL3 = '0xca11bde05977b3631167028862be2a173976ca11'
const CORS = {
  'access-control-allow-origin': '*',
  'access-control-allow-methods': 'GET, POST, OPTIONS',
  'access-control-allow-headers': '*',
}

function answerRpc(req: { id: number; method: string; params?: unknown[] }, chain: 'base' | 'mainnet') {
  const ok = (result: unknown) => ({ jsonrpc: '2.0', id: req.id, result })
  switch (req.method) {
    case 'eth_chainId':
      return ok(chain === 'base' ? '0x2105' : '0x1')
    case 'eth_blockNumber':
      return ok('0x1000')
    case 'eth_call': {
      const call = (req.params as { to: string; data: Hex }[])[0]
      if (chain !== 'base' || call.to.toLowerCase() !== MULTICALL3) return ok('0x') // ENS lookups: nothing found
      const { args } = decodeFunctionData({ abi: multicall3Abi, data: call.data })
      const results = (args[0] as { target: string; callData: Hex }[]).map(({ target, callData }) => {
        const token = STOCKS.find((s) => s.address === target.toLowerCase())
        const fn = decodeFunctionData({ abi: erc20Abi, data: callData })
        if (!token || fn.functionName !== 'balanceOf') return { success: false, returnData: '0x' as Hex }
        const owner = String(fn.args![0]).toLowerCase()
        const amount = owner === EMPTY_WALLET.toLowerCase() ? 0 : (HOLDINGS[token.symbol] ?? 0)
        const raw = parseUnits(String(amount), token.decimals)
        return { success: true, returnData: encodeAbiParameters([{ type: 'uint256' }], [raw]) }
      })
      return ok(encodeFunctionResult({ abi: multicall3Abi, functionName: 'aggregate3', result: results }))
    }
    default:
      return { jsonrpc: '2.0', id: req.id, error: { code: -32601, message: `${req.method} not mocked` } }
  }
}

async function rpcRoute(route: Route, chain: 'base' | 'mainnet') {
  const request = route.request()
  if (request.method() === 'OPTIONS') return route.fulfill({ status: 204, headers: CORS })
  const body = request.postDataJSON()
  const json = Array.isArray(body) ? body.map((r) => answerRpc(r, chain)) : answerRpc(body, chain)
  return route.fulfill({ status: 200, contentType: 'application/json', headers: CORS, body: JSON.stringify(json) })
}

export async function mockNetwork(page: Page) {
  await page.route('**://base-rpc.publicnode.com/**', (r) => rpcRoute(r, 'base'))
  await page.route('**://ethereum-rpc.publicnode.com/**', (r) => rpcRoute(r, 'mainnet'))
  // Token icons are decorative; serve a tiny image so tests never wait on the network.
  await page.route('**://metadata.coinbase.com/**', (r) =>
    r.fulfill({ status: 200, contentType: 'image/svg+xml', body: '<svg xmlns="http://www.w3.org/2000/svg" width="8" height="8"/>' }),
  )
  await page.route('**://api.dexscreener.com/**', (route) => {
    const asked = new Set(route.request().url().split('/').pop()!.split(',').map((a) => a.toLowerCase()))
    const pairs = STOCKS.filter((s) => asked.has(s.address) && !NO_POOL.has(s.symbol)).map((s) => ({
      baseToken: { address: s.address, symbol: s.symbol },
      priceUsd: String(PRICE[s.symbol] ?? 50),
      priceChange: { h24: CHANGE[s.symbol] ?? 0 },
      liquidity: { usd: THIN.has(s.symbol) ? 500 : 1_000_000 },
    }))
    return route.fulfill({ status: 200, contentType: 'application/json', headers: CORS, body: JSON.stringify(pairs) })
  })
}

// A minimal EIP-1193 wallet announced through EIP-6963, the same way MetaMask and Rabby appear.
export async function injectWallet(page: Page, account = WALLET) {
  const icon = `data:image/svg+xml;base64,${Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="8" height="8"/>').toString('base64')}`
  await page.addInitScript(
    ({ account, icon }) => {
      const listeners: Record<string, Array<(...a: unknown[]) => void>> = {}
      const provider = {
        request: async ({ method }: { method: string }) => {
          switch (method) {
            // Like a real wallet: no accounts are exposed until the user approves the site.
            case 'eth_requestAccounts':
              localStorage.setItem('mock-wallet-authorized', '1')
              return [account]
            case 'eth_accounts':
              return localStorage.getItem('mock-wallet-authorized') ? [account] : []
            case 'eth_chainId':
              return '0x2105'
            case 'net_version':
              return '8453'
            case 'wallet_requestPermissions':
              return []
            case 'wallet_revokePermissions':
              localStorage.removeItem('mock-wallet-authorized')
              return null
            case 'wallet_switchEthereumChain':
              return null
            default:
              throw Object.assign(new Error(`Unsupported method ${method}`), { code: 4200 })
          }
        },
        on: (event: string, fn: (...a: unknown[]) => void) => void (listeners[event] ||= []).push(fn),
        removeListener: (event: string, fn: (...a: unknown[]) => void) => {
          listeners[event] = (listeners[event] || []).filter((f) => f !== fn)
        },
      }
      const info = { uuid: '350670db-19fa-4704-a166-e52e178b59d2', name: 'Test Wallet', icon, rdns: 'io.test.wallet' }
      const announce = () =>
        window.dispatchEvent(new CustomEvent('eip6963:announceProvider', { detail: Object.freeze({ info, provider }) }))
      window.addEventListener('eip6963:requestProvider', announce)
      announce()
    },
    { account, icon },
  )
}

export const test = base.extend({
  page: async ({ page }, provide) => {
    await mockNetwork(page)
    await provide(page)
  },
})
export { expect } from '@playwright/test'
