import { expect, test } from '@playwright/test'

test('гость может создать бронирование', async ({ page }) => {
  await page.goto('/public')

  await expect(page.getByText('Публичное бронирование')).toBeVisible()
  await page.locator('.slot').first().click()
  await page.locator('input[name="guestName"]').fill('Тестовый Гость')
  await page
    .locator('input[name="guestEmail"]')
    .fill(`guest${Date.now()}@example.com`)
  await page.getByRole('button', { name: 'Забронировать' }).click()

  await expect(page.getByText('Бронирование успешно создано.')).toBeVisible()
})
