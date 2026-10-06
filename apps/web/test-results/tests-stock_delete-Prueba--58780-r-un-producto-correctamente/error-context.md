# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: tests/stock_delete.spec.ts >> Prueba de Funcionalidad stock.delete >> Debería eliminar un producto correctamente
- Location: tests/stock_delete.spec.ts:7:7

# Error details

```
Error: expect(locator).toContainText(expected) failed

Locator: locator('h1')
Expected substring: "BIENVENIDO A LA PLATAFORMA"
Received string:    "Bienvenido"
Timeout: 5000ms

Call log:
  - Expect "toContainText" with timeout 5000ms
  - waiting for locator('h1')
    14 × locator resolved to <h1>Bienvenido</h1>
       - unexpected value "Bienvenido"

```

```yaml
- heading "Bienvenido" [level=1]
```

# Test source

```ts
  1  | import { test, expect } from '@playwright/test';
  2  |
  3  | test.describe('Prueba de Funcionalidad stock.delete', () => {
  4  |   const username = 'test_user_delete';
  5  |   const password = 'password123';
  6  |
  7  |   test('Debería eliminar un producto correctamente', async ({ page }) => {
  8  |     // 1. Registro
  9  |     await page.goto('http://localhost:3005');
  10 |     await page.click('text=Regístrate aquí'); // Selector ajustado según RegisterPage
  11 |     await page.fill('input[placeholder="Usuario"]', username);
  12 |     await page.fill('input[placeholder="Contraseña (mín 6)"]', password);
  13 |     await page.fill('input[placeholder="Nombre de Cliente"]', 'Test');
  14 |     await page.click('button[type="submit"]');
  15 |
  16 |     // 2. Iniciar sesión
  17 |     await page.fill('input[placeholder="Usuario"]', username);
  18 |     await page.fill('input[placeholder="Contraseña"]', password);
  19 |     await page.click('button[type="submit"]');
  20 |
  21 |     // Verificar login exitoso (debería redirigir a dashboard)
> 22 |     await expect(page.locator('h1')).toContainText('BIENVENIDO A LA PLATAFORMA');
     |                                      ^ Error: expect(locator).toContainText(expected) failed
  23 |
  24 |     // 2. Acceder al panel de stock (asumiendo que es accesible o la página principal)
  25 |     // Según estructura, StockPanel está en el componente principal o navegable.
  26 |     // Vamos a asumir que está en la página principal tras login.
  27 |
  28 |     // Esperar a que los productos carguen
  29 |     await page.waitForSelector('.masonry-item');
  30 |
  31 |     // 3. Identificar un producto (usaremos el primero para probar)
  32 |     const card = page.locator('.masonry-item').first();
  33 |     const productCode = await card.locator('span').first().textContent();
  34 |     console.log(`Intentando eliminar producto: ${productCode}`);
  35 |
  36 |     // 4. Expandir para ver botones
  37 |     await card.click();
  38 |
  39 |     // 5. Clic en Eliminar
  40 |     await card.locator('button:has-text("Eliminar")').click();
  41 |
  42 |     // 6. Verificar resultado (debería desaparecer de la UI o mostrar mensaje)
  43 |     // Asumimos que la lista se recarga y el elemento desaparece
  44 |     await expect(page.locator('.masonry-item:has-text("' + productCode + '")')).toHaveCount(0);
  45 |   });
  46 | });
  47 |
```
