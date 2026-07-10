import { test, expect } from '@playwright/test'

test('intelligence page loads', async ({ page }) => {
  await page.goto('/intelligence')
  await expect(page.locator('text=RISK_INTEL_SYSTEM_V1.0')).toBeVisible()
})

test('intelligence page has risk alert section', async ({ page }) => {
  await page.goto('/intelligence')
  await expect(page.locator('text=Tactical Intelligence')).toBeVisible()
})

test('intelligence page has agent trigger', async ({ page }) => {
  await page.goto('/intelligence')
  await expect(page.locator('text=Trigger Agent')).toBeVisible()
})
