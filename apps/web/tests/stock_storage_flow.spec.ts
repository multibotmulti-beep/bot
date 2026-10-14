import { test, expect } from '@playwright/test';

test('test anonymous profile creation and function execution against real database', async ({ page }) => {
  // 1. Visitar la página web
  await page.goto('http://localhost:3000');
  await page.waitForLoadState('networkidle');

  // 2. Crear un perfil anónimo en la base de datos real mediante la API del servidor
  const profileRes = await page.request.post('http://localhost:4000/bot/profiles/anonymous', {
    headers: { 'Content-Type': 'application/json' },
    data: {}
  });
  const profileJson = await profileRes.json();
  expect(profileJson.success).toBe(true);
  const botId = profileJson.profile.botId;
  expect(botId).toBeTruthy();

  // 3. Ejecutar la función stock.check en modo anónimo contra la base de datos real
  const execRes = await page.request.post('http://localhost:4000/bot/execute-function', {
    headers: {
      'X-Anonymous-Mode': 'true'
    },
    data: {
      actionKey: 'stock.check',
      senderPhone: '+5491155556666',
      botId: botId
    }
  });

  const execJson = await execRes.json();
  expect(execJson.success).toBe(true);
  expect(execJson.message).toContain('Consulta de Stock');
});
