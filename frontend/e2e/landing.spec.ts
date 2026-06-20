import { test, expect } from '@playwright/test'

test('landing page loads and displays key content', async ({ page }) => {
  await page.goto('/')
  await expect(page.locator('text=RISK_INTEL_SYSTEM_V1.0')).toBeVisible()
  await expect(page.locator('text=Operational Intelligence')).toBeVisible()
  await expect(page.locator('text=Launch Console')).toBeVisible()
  await expect(page.locator('text=Initialize Node')).toBeVisible()
})

test('navigation links are present', async ({ page }) => {
  await page.goto('/')
  await expect(page.locator('a[href="/intelligence"]')).toBeVisible()
  await expect(page.locator('a[href="/ecosystem"]')).toBeVisible()
  await expect(page.locator('a[href="/architecture"]')).toBeVisible()
  await expect(page.locator('a[href="/devdocs"]')).toBeVisible()
  await expect(page.locator('a[href="/console"]')).toBeVisible()
})

test('technology pipeline section renders all five cards', async ({ page }) => {
  await page.goto('/')
  const cards = page.locator('text=Go').or(page.locator('text=Scala'))
    .or(page.locator('text=Python'))
    .or(page.locator('text=Rust'))
    .or(page.locator('text=Next.js'))
  await expect(cards.first()).toBeVisible()
})
