import { test, expect } from '@playwright/test'

test('ecosystem page loads', async ({ page }) => {
  await page.goto('/ecosystem')
  await expect(page.locator('text=Agent Ecosystem')).toBeVisible()
})

test('ecosystem page shows throughput stats', async ({ page }) => {
  await page.goto('/ecosystem')
  await expect(page.locator('text=Throughput')).toBeVisible()
})
