import { test, expect } from '@playwright/test';

const API = 'http://localhost:4000';

test('tagging flow creates a tag with contact quality and trajectory', async ({ page, request }) => {
  const login = await request.post(`${API}/api/dev/login`);
  const { accessToken } = await login.json();
  const headers = { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' };

  const game = await (
    await request.post(`${API}/api/games`, {
      headers,
      data: { name: 'Playwright Test Game', date: '2026-01-01', home: 'Home', away: 'Away' },
    })
  ).json();
  const batter = await (
    await request.post(`${API}/api/players`, { headers, data: { name: 'Playwright Batter', bat: 'R' } })
  ).json();
  const pitcher = await (
    await request.post(`${API}/api/players`, { headers, data: { name: 'Playwright Pitcher', thr: 'RHP' } })
  ).json();

  try {
    await page.addInitScript((token) => {
      localStorage.setItem('et_access_token', token);
    }, accessToken);

    await page.goto('/');
    await page.getByRole('button', { name: 'Tagging' }).click();
    await expect(page.locator('.taggingPanel')).toBeVisible();

    const selects = page.locator('.taggingPanel select');
    await selects.nth(0).selectOption({ label: `${game.name} · ${game.date}` });
    await selects.nth(1).selectOption({ label: batter.name });
    await selects.nth(2).selectOption({ label: pitcher.name });

    // "Single" needs a batted-ball detail (Quality + Trajectory) before it can save
    await page.getByRole('button', { name: 'Single', exact: true }).click();
    await expect(page.locator('.detailSheet')).toBeVisible();

    const [qualityGrid, trajectoryGrid] = await page.locator('.detailSheet .choiceGrid').all();
    await qualityGrid.getByRole('button', { name: 'Hard' }).click();
    await trajectoryGrid.getByRole('button', { name: 'Ground Ball' }).click();

    page.once('dialog', (d) => d.accept());
    await page.locator('.detailSheet button.primary').click();

    // must close and NOT reopen (regression check for the save-loop bug)
    await expect(page.locator('.detailSheet')).toHaveCount(0);
    await expect(page.locator('.taggingPanel .list')).toContainText('Single');
  } finally {
    const tags = await (await request.get(`${API}/api/tags?game_id=${game.id}`, { headers })).json();
    for (const t of tags) await request.delete(`${API}/api/tags/${t.tag_id}`, { headers });
    await request.delete(`${API}/api/games/${game.id}`, { headers });
    await request.delete(`${API}/api/players/${batter.id}`, { headers });
    await request.delete(`${API}/api/players/${pitcher.id}`, { headers });
  }
});
