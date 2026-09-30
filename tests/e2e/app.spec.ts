import { BUYABLE_COUNT, EMPTY_WALLET, EXPECTED_TOTAL, HELD_ORDER, injectWallet, short, stock, test, expect, WALLET } from './fixtures'
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
    await expect(page.getByRole('heading', { name: 'Read-only snapshot' })).toBeVisible()
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
    await expect(page.getByText('3 of 40')).toBeVisible()
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

test('layout never scrolls sideways', async ({ page }) => {
  await connect(page)
  await expect(page.getByTestId('holding').first()).toBeVisible()
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)
  expect(overflow).toBeLessThanOrEqual(1)
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
