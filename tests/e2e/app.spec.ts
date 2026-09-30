import { BUYABLE_COUNT, EMPTY_WALLET, EXPECTED_TOTAL, HELD_ORDER, injectWallet, short, stock, STOCKS, test, expect, WALLET } from './fixtures'
import type { Page } from '@playwright/test'

async function connect(page: Page) {
  await injectWallet(page)
  await page.goto('/')
  await page.getByRole('button', { name: 'Connect wallet' }).first().click()
  await page.getByRole('button', { name: /Test Wallet/ }).click()
  await expect(page.getByText(short(WALLET))).toBeVisible()
}

test.describe('landing', () => {
  test.use({ colorScheme: 'light' })

  test('explains the scope and offers both ways in', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByRole('heading', { level: 1 })).toContainText('Only your stocks')
    await expect(page.getByText('Coinbase-issued tokenized stocks · Base only')).toBeVisible()
    await expect(page.getByRole('button', { name: 'Connect wallet' }).first()).toBeVisible()
    await expect(page.getByLabel('Or look up any wallet, view only')).toBeVisible()
    await expect(page.getByRole('link', { name: 'Mitchel' })).toHaveAttribute('href', 'https://pawiromitchel.com/')
    await expect(page.getByRole('navigation', { name: 'Main' }).getByRole('link', { name: 'Portfolio' })).toHaveAttribute('aria-current', 'page')
  })

  test('previews the deepest pools without a wallet', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByTestId('market-row')).toHaveCount(8)
    await page.getByRole('link', { name: 'See all 40 stocks' }).click()
    await expect(page).toHaveURL(/#\/stocks$/)
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('All 40 tokenized stocks')
  })

  test('theme toggle switches to OLED dark and persists', async ({ page }) => {
    await page.goto('/')
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'light')
    await page.getByRole('button', { name: 'Switch to dark mode' }).click()
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark')
    await expect(page.locator('body')).toHaveCSS('background-color', 'rgb(0, 0, 0)')
    await page.reload()
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark')
    await expect(page.getByRole('button', { name: 'Switch to light mode' })).toBeVisible()
  })

  test('rejects lookups that are neither an address nor an ENS name', async ({ page }) => {
    await page.goto('/')
    await page.getByLabel('Or look up any wallet, view only').fill('hello')
    await page.getByRole('button', { name: 'View portfolio' }).click()
    await expect(page.getByRole('alert')).toContainText('Enter a 0x address or an ENS name')
    expect(page.url()).not.toContain('#/view')
  })
})

test.describe('first load', () => {
  test('static shell in index.html matches the app, so nothing jumps', async ({ browser, page }) => {
    // Without JavaScript only the shell from index.html shows.
    const bare = await browser.newContext({ javaScriptEnabled: false })
    const shell = await bare.newPage()
    await shell.goto('/')
    const read = (p: Page) =>
      Promise.all([p.locator('h1').innerText(), p.locator('.lede').innerText(), p.locator('.tag').innerText(), p.locator('.brand').innerText()])
    const before = await read(shell)
    await bare.close()

    await page.goto('/')
    await expect(page.getByRole('button', { name: 'View portfolio' })).toBeVisible() // React has taken over
    expect(await read(page)).toEqual(before)
  })

  test('reuses the price requests started by index.html', async ({ page }) => {
    let calls = 0
    page.on('request', (r) => r.url().includes('api.dexscreener.com') && calls++)
    await page.goto('/')
    await expect(page.getByTestId('market-row')).toHaveCount(8)
    expect(calls).toBe(Math.ceil(STOCKS.length / 30))
  })

  test('shows the last known prices at once on a repeat visit', async ({ page }) => {
    await page.goto('/#/stocks')
    await expect(page.getByTestId('market-row')).toHaveCount(40)
    // Hold the next price response back: the cached prices must still show.
    await page.route('**://api.dexscreener.com/**', () => {})
    await page.reload()
    await expect(page.getByTestId('market-row')).toHaveCount(40)
    await expect(page.getByTestId('market-row').filter({ hasText: 'NVDAc' })).toContainText('$200.00')
  })
})

test('ships the metadata, icons and manifest', async ({ page, request }) => {
  await page.goto('/')
  await expect(page).toHaveTitle('Onchain Stocks')
  for (const sel of ['meta[name="description"]', 'meta[property="og:image"]', 'meta[name="twitter:card"]', 'link[rel="canonical"]']) {
    await expect(page.locator(sel)).toHaveCount(1)
  }
  const manifest = await (await request.get('/manifest.webmanifest')).json()
  expect(manifest.name).toBe('Onchain Stocks')
  for (const path of ['/favicon.ico', '/favicon.svg', '/apple-touch-icon.png', '/og.png', '/robots.txt', '/sitemap.xml', ...manifest.icons.map((i: { src: string }) => `/${i.src}`)]) {
    expect((await request.get(path)).status(), path).toBe(200)
  }
})

test.describe('view only', () => {
  test('looks up an address: read-only, no buy buttons, correct totals', async ({ page }) => {
    await page.goto('/')
    await page.getByLabel('Or look up any wallet, view only').fill(WALLET)
    await page.getByRole('button', { name: 'View portfolio' }).click()

    await expect(page.getByRole('status')).toContainText('View only')
    expect(page.url()).toContain(`#/view/${WALLET}`)
    await expect(page.getByTestId('total-value')).toHaveText(EXPECTED_TOTAL)
    await expect(page.getByTestId('holding')).toHaveCount(3)
    await expect(page.getByRole('link', { name: 'Buy more' })).toHaveCount(0)
    await expect(page.getByRole('button', { name: /More venues/ })).toHaveCount(0)
    await expect(page.getByRole('heading', { name: 'Not in your wallet yet' })).toHaveCount(0)
    await expect(page.getByRole('complementary', { name: 'Summary' })).toContainText('3 of 40')
    await expect(page.getByRole('button', { name: 'Copy link' })).toBeVisible()
  })

  test('remembers wallets that were looked up', async ({ page }) => {
    await page.goto(`/#/view/${WALLET}`)
    await expect(page.getByTestId('holding')).toHaveCount(3)
    await page.getByRole('button', { name: 'Look up another' }).click()
    const recent = page.getByRole('link', { name: short(WALLET) })
    await expect(recent).toHaveAttribute('href', `#/view/${WALLET}`)
    await page.getByRole('button', { name: 'Clear' }).click()
    await expect(recent).toHaveCount(0)
  })

  test('"Look up another" returns to the landing page', async ({ page }) => {
    await page.goto(`/#/view/${WALLET}`)
    await page.getByRole('button', { name: 'Look up another' }).click()
    await expect(page.getByRole('heading', { level: 1 })).toContainText('Only your stocks')
    expect(page.url()).not.toContain('#/view')
  })

  test('shows an empty state for a wallet with no stocks', async ({ page }) => {
    await page.goto(`/#/view/${EMPTY_WALLET}`)
    await expect(page.getByText('No Coinbase tokenized stocks in this wallet on Base.')).toBeVisible()
  })

  test('explains when a name cannot be resolved', async ({ page }) => {
    await page.goto('/#/view/not..valid')
    await expect(page.getByText(/Could not find a wallet/)).toBeVisible()
  })
})

test.describe('connected wallet', () => {
  test('connects through the modal and shows holdings sorted by value', async ({ page }) => {
    await connect(page)
    await expect(page.getByTestId('total-value')).toHaveText(EXPECTED_TOTAL)
    await expect(page.getByTestId('holding').locator('.sym')).toHaveText(HELD_ORDER)
    await expect(page.getByRole('status')).toHaveCount(0) // no view-only banner
    await expect(page.getByRole('heading', { name: /Your stocks/ })).toContainText('3 of 40')
    await expect(page.getByTestId('freshness')).toContainText(/Updated|Updating/)
  })

  test('buy links deep-link to the right token', async ({ page }) => {
    await connect(page)
    const nvda = stock('NVDAc')
    const buy = page.getByTestId('holding').filter({ hasText: 'NVDAc' }).getByRole('link', { name: 'Buy more' })
    await expect(buy).toHaveAttribute('href', new RegExp(`aerodrome\\.finance/swap.*to=${nvda.address}`))
    await expect(buy).toHaveAttribute('target', '_blank')
  })

  test('offers only buyable stocks not yet held, and can expand the list', async ({ page }) => {
    await connect(page)
    await expect(page.getByRole('heading', { name: 'Not in your wallet yet' })).toBeVisible()
    await expect(page.getByTestId('buy-card')).toHaveCount(8)
    await page.getByRole('button', { name: `Show all ${BUYABLE_COUNT} stocks` }).click()
    await expect(page.getByTestId('buy-card')).toHaveCount(BUYABLE_COUNT)
    await expect(page.getByTestId('buy-card').filter({ hasText: 'WENc' })).toHaveCount(0) // no pool, nothing to buy
    await page.getByRole('button', { name: 'Show fewer' }).click()
    await expect(page.getByTestId('buy-card')).toHaveCount(8)
  })

  test('venue menu lists every exchange, warns on thin pools, and closes', async ({ page }) => {
    await connect(page)
    const trigger = page.getByRole('button', { name: 'More venues to swap TSLAc' })
    await trigger.click()
    const menu = page.getByRole('menu')
    for (const venue of ['Aerodrome', 'Uniswap', 'Matcha', '1inch', 'CoW Swap']) {
      await expect(menu.getByRole('menuitem', { name: new RegExp(venue) })).toBeVisible()
    }
    await expect(menu).toContainText('Thin liquidity for TSLAc')

    await page.keyboard.press('Escape')
    await expect(menu).toHaveCount(0)

    await trigger.click()
    await expect(menu).toBeVisible()
    await page.getByRole('heading', { name: 'Your stocks' }).click() // click elsewhere
    await expect(menu).toHaveCount(0)
  })

  test('disconnect returns to the landing page', async ({ page }) => {
    await connect(page)
    await page.getByRole('button', { name: 'Disconnect wallet' }).click()
    await expect(page.getByRole('heading', { level: 1 })).toContainText('Only your stocks')
    await expect(page.getByText(short(WALLET))).toHaveCount(0)
  })

  test('stays connected after a reload', async ({ page }) => {
    await connect(page)
    await page.reload()
    await expect(page.getByText(short(WALLET))).toBeVisible()
    await expect(page.getByTestId('total-value')).toHaveText(EXPECTED_TOTAL)
  })

  test('connect modal can be dismissed', async ({ page }) => {
    await injectWallet(page)
    await page.goto('/')
    await page.getByRole('button', { name: 'Connect wallet' }).first().click()
    await expect(page.getByRole('dialog')).toBeVisible()
    await page.getByRole('button', { name: 'Close' }).click()
    await expect(page.getByRole('dialog')).toHaveCount(0)
  })
})

test.describe('stocks', () => {
  test('lists every stock, searches and sorts', async ({ page, isMobile }) => {
    await page.goto('/#/stocks')
    const rows = page.getByTestId('market-row')
    await expect(rows).toHaveCount(40)
    // Deepest pools first, stocks without a pool last.
    await expect(rows.last()).toContainText(/WENc|BIRDc/)
    await expect(rows.last()).toContainText('No pool yet')

    if (isMobile) {
      await page.getByLabel('Sort').selectOption('price:desc')
    } else {
      await page.getByRole('button', { name: /Price/ }).click()
      await expect(page.getByRole('columnheader', { name: /Price/ })).toHaveAttribute('aria-sort', 'descending')
    }
    await expect(rows.first()).toContainText('TSLAc') // $400, the highest fixture price

    await page.getByLabel('Search stocks').fill('nvid')
    await expect(rows).toHaveCount(1)
    await expect(rows.first()).toContainText('NVDAc')
    await page.getByLabel('Search stocks').fill('zzz')
    await expect(page.getByText('No Coinbase stock token matches')).toBeVisible()
  })

  test('stock page shows price, venues, contract and warnings', async ({ page }) => {
    const tsla = stock('TSLAc')
    await page.goto('/#/stocks')
    await page.getByTestId('market-row').filter({ hasText: 'TSLAc' }).getByRole('link', { name: /^TSLAc/ }).click()
    await expect(page).toHaveURL(/#\/stock\/TSLAc$/)
    await expect(page.getByTestId('stock-price')).toHaveText('$400.00')
    await expect(page.getByText('Thin liquidity. Expect heavy slippage')).toBeVisible()
    await expect(page.getByTestId('contract')).toHaveText(tsla.address)
    await expect(page.getByRole('link', { name: 'BaseScan' })).toHaveAttribute('href', `https://basescan.org/token/${tsla.address}`)
    for (const venue of ['Aerodrome', 'Uniswap', 'Matcha', '1inch', 'CoW Swap']) {
      await expect(page.getByRole('link', { name: `Swap TSLAc on ${venue}` })).toHaveAttribute('target', '_blank')
    }
    await expect(page).toHaveTitle(/TSLAc/)
  })

  test('stock without a pool has no venues', async ({ page }) => {
    await page.goto('/#/stock/WENc')
    await expect(page.getByText('No DEX pool yet')).toBeVisible()
    await expect(page.getByRole('heading', { name: /Where to swap/ })).toHaveCount(0)
  })

  test('unknown symbols are refused', async ({ page }) => {
    await page.goto('/#/stock/FAKEc')
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Not a Coinbase stock token')
  })

  test('connected wallets see their position on a stock page', async ({ page }) => {
    await connect(page)
    await page.getByTestId('holding').filter({ hasText: 'NVDAc' }).getByRole('link', { name: /^NVDAc/ }).click()
    await expect(page.getByText('In your wallet')).toBeVisible()
    await expect(page.getByText('≈ $300.00')).toBeVisible()
  })
})

test('about page answers the common questions', async ({ page }) => {
  await page.goto('/#/about')
  await page.getByText('Does this site touch my funds?').click()
  await expect(page.getByText('It never asks for a signature')).toBeVisible()
})

test('layout never scrolls sideways', async ({ page }) => {
  await connect(page)
  await expect(page.getByTestId('holding').first()).toBeVisible()
  for (const hash of ['', '#/stocks', '#/stock/TSLAc', '#/about', `#/view/${WALLET}`]) {
    if (hash) await page.goto(`/${hash}`)
    await expect(page.locator('main')).toBeVisible()
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)
    expect(overflow, hash || 'portfolio').toBeLessThanOrEqual(1)
  }
})

test.describe('motion', () => {
  test.use({ reducedMotion: 'no-preference' })

  test('animations run to completion and land on the right values', async ({ page }) => {
    await connect(page)
    await expect(page.getByTestId('total-value')).toHaveText(EXPECTED_TOTAL, { timeout: 5000 })
    for (const row of await page.getByTestId('holding').all()) {
      await expect(row).toHaveCSS('opacity', '1', { timeout: 5000 })
    }
    const widths = await page.locator('.alloc .seg').evaluateAll((els) => els.map((e) => e.getBoundingClientRect().width))
    await expect.poll(async () => {
      const w = await page.locator('.alloc .seg').evaluateAll((els) => els.reduce((s, e) => s + e.getBoundingClientRect().width, 0))
      return w > 100
    }).toBe(true)
    expect(widths).toHaveLength(3)
  })
})
