import { test, expect } from '@playwright/test'

test('architecture page loads', async ({ page }) => {
  await page.goto('/architecture')
  await expect(page.locator('text=System Architecture')).toBeVisible()
})

test('architecture page shows polyglot stack', async ({ page }) => {
  await page.goto('/architecture')
  await expect(page.locator('text=Go').or(page.locator('text=Scala'))).toBeVisible()
})

test('architecture page has infrastructure diagram', async ({ page }) => {
  await page.goto('/architecture')
  await expect(page.locator('text=Infrastructure')).toBeVisible()
})
