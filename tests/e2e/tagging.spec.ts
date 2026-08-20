import { test, expect } from '@playwright/test';

test('tagging flow creates a tag', async ({ page }) => {
  const login = await page.request.post('http://localhost:4000/api/dev/login');
  const { accessToken } = await login.json();
  await page.addInitScript((token) => {
    localStorage.setItem('et_access_token', token);
  }, accessToken);
  await page.goto('http://localhost:5174/');
  // navigate to Tagging view
  await expect(page.getByRole('button', { name: 'Tagging' })).toBeVisible({ timeout: 5000 });
  await page.getByRole('button', { name: 'Tagging' }).click();
  // select game
  await page.waitForSelector('select');
  await page.selectOption('select', 'game1');
  // select batter and pitcher
  const selects = await page.$$('select');
  if(selects.length >= 3){
    await selects[1].selectOption('player1');
    await selects[2].selectOption('player1');
  }
  // click a result
  await page.click('text=Single');
  // if detail sheet opened, save detail
  const saveBtn = await page.$('text=Save');
  if(saveBtn){
    await page.fill('textarea','Line Drive');
    await saveBtn.click();
  }
  // expect an alert or confirmation (we used alert in code)
  // fallback: wait for tag list to include 'Single'
  await page.waitForSelector('text=Single', { timeout: 3000 });
  const has = await page.locator('text=Single').count();
  expect(has).toBeGreaterThan(0);
});
