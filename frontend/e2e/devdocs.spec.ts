import { test, expect } from '@playwright/test'

test('devdocs page loads', async ({ page }) => {
  await page.goto('/devdocs')
  await expect(page.locator('text=Documentation')).toBeVisible()
})

test('devdocs page has API interaction lab', async ({ page }) => {
  await page.goto('/devdocs')
  await expect(page.locator('text=API')).toBeVisible()
})
