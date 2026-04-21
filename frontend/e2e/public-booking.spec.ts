import { expect, test } from '@playwright/test'

test('гость может создать бронирование', async ({ page }) => {
  await page.goto('/public')

  await expect(page.getByRole('heading', { name: 'Calendar' })).toBeVisible()
  await page.getByRole('button', { name: 'Записаться' }).first().click()
  await page
    .getByRole('button', { name: /Встреча 15 минут/i })
    .first()
    .click()
  await page.locator('.slot-row').filter({ hasText: 'Свободно' }).first().click()
  await page.getByRole('button', { name: 'Продолжить' }).click()
  await page.locator('input[name="guestName"]').fill('Тестовый Гость')
  await page
    .locator('input[name="guestEmail"]')
    .fill(`guest${Date.now()}@example.com`)
  await page.getByRole('button', { name: 'Забронировать' }).click()

  await expect(page.getByText('Бронирование успешно создано.')).toBeVisible()
})
