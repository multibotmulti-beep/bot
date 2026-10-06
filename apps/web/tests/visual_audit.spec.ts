import { test, expect } from '@playwright/test';

test('visual audit and console log check', async ({ page }) => {
  // Escuchar logs de consola
  page.on('console', (msg) =>
    console.log(`BROWSER LOG: [${msg.type()}] ${msg.text()}`)
  );
  page.on('pageerror', (exception) =>
    console.log(`BROWSER ERROR: ${exception}`)
  );

  // Navegar a la página
  await page.goto('http://localhost:3002');

  // Capturar pantalla
  await page.screenshot({ path: 'audit-screenshot.png' });

  // Verificar que la página tiene contenido
  await expect(page.locator('body')).toBeVisible();
});
