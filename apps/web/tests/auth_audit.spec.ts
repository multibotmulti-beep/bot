import { test, expect } from '@playwright/test';

test.describe('Flujo de Autenticación E2E Detallado', () => {
  const username = `user_${Date.now()}`;
  const password = 'password123';
  const nombreCliente = 'Cliente Test';

  test('Prueba completa: Registro, Login y Logout', async ({ page }) => {
    await page.goto('http://localhost:3005');

    // 1. Registro mal (datos faltantes)
    await page.click('text=Regístrate');
    await page.click('button[type="submit"]');

    // Verificar que cada campo faltante tenga su mensaje
    await expect(page.locator('text=Falta este campo')).toHaveCount(3);

    // Verificar que los logs de auditoría detectaron cada campo
    await page.waitForTimeout(500);
    await expect(page.locator('div[style*="fixed"]')).toContainText(
      'Validación Registro: Campo username vacío'
    );
    await expect(page.locator('div[style*="fixed"]')).toContainText(
      'Validación Registro: Campo password vacío'
    );
    await expect(page.locator('div[style*="fixed"]')).toContainText(
      'Validación Registro: Campo nombreCliente vacío'
    );

    // 2. Registro bien
    await page.fill('input[placeholder="Usuario"]', username);
    await page.fill('input[placeholder="Contraseña (mín 6)"]', password);
    await page.fill('input[placeholder="Nombre de Cliente"]', nombreCliente);
    await page.click('button[type="submit"]');

    // Debería redirigir al login (h1 vuelve a ser 'Iniciar Sesión')
    await expect(page.locator('h1')).toHaveText('Iniciar Sesión');

    // 3. Login mal (datos incorrectos)
    await page.fill('input[placeholder="Usuario"]', 'no_existe');
    await page.fill('input[placeholder="Contraseña"]', 'password123');
    await page.click('button[type="submit"]');

    // Selector específico para el error global fuera del formulario
    await expect(
      page.locator('main > p:has-text("Usuario o contraseña incorrectos.")')
    ).toBeVisible();

    // Verificar que aparece el Toast de error de autenticación
    await expect(page.locator('div[style*="fixed"]')).toContainText(
      'Error en login: Usuario o contraseña incorrectos.'
    );

    // 4. Login bien
    await page.fill('input[placeholder="Usuario"]', username);
    await page.fill('input[placeholder="Contraseña"]', password);
    await page.click('button[type="submit"]');

    // Esperar a que la UI cambie a la plataforma
    await expect(page.locator('h1')).toHaveText('¡BIENVENIDO A LA PLATAFORMA!');
    await expect(
      page.locator('text=Sesión iniciada correctamente.')
    ).toBeVisible();

    // 5. Cerrar sesión
    await page.click('text=Cerrar Sesión');
    await expect(page.locator('h1')).toHaveText('Iniciar Sesión');
  });
});
