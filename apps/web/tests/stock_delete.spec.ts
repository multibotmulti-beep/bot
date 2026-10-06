import { test, expect } from '@playwright/test';

test.describe('Prueba de Funcionalidad stock.delete', () => {
  const username = 'test_user_delete';
  const password = 'password123';

  test('Debería eliminar un producto correctamente', async ({ page }) => {
    // 1. Registro
    await page.goto('http://localhost:3005');
    await page.click('text=Regístrate aquí'); // Selector ajustado según RegisterPage
    await page.fill('input[placeholder="Usuario"]', username);
    await page.fill('input[placeholder="Contraseña (mín 6)"]', password);
    await page.fill('input[placeholder="Nombre de Cliente"]', 'Test');
    await page.click('button[type="submit"]');

    // 2. Iniciar sesión
    await page.fill('input[placeholder="Usuario"]', username);
    await page.fill('input[placeholder="Contraseña"]', password);
    await page.click('button[type="submit"]');

    // Verificar login exitoso (debería redirigir a dashboard)
    await expect(page.locator('h1')).toContainText(
      'BIENVENIDO A LA PLATAFORMA'
    );

    // 2. Acceder al panel de stock (asumiendo que es accesible o la página principal)
    // Según estructura, StockPanel está en el componente principal o navegable.
    // Vamos a asumir que está en la página principal tras login.

    // Esperar a que los productos carguen
    await page.waitForSelector('.masonry-item');

    // 3. Identificar un producto (usaremos el primero para probar)
    const card = page.locator('.masonry-item').first();
    const productCode = await card.locator('span').first().textContent();
    console.log(`Intentando eliminar producto: ${productCode}`);

    // 4. Expandir para ver botones
    await card.click();

    // 5. Clic en Eliminar
    await card.locator('button:has-text("Eliminar")').click();

    // 6. Verificar resultado (debería desaparecer de la UI o mostrar mensaje)
    // Asumimos que la lista se recarga y el elemento desaparece
    await expect(
      page.locator('.masonry-item:has-text("' + productCode + '")')
    ).toHaveCount(0);
  });
});
