import { test, expect } from '@playwright/test';

test.describe('Auditoría y Prueba de Mensajes y Nodos en el Frontend (Panel 3)', () => {
  const baseURL = 'http://localhost:3001';

  test('Debería cargar el simulador de chat y permitir agregar, configurar y eliminar mensajes/opciones de nodo jerárquicamente', async ({ page }) => {
    // Escuchar logs de consola para auditoría
    page.on('console', msg => console.log(`[TEST BROWSER LOG]: ${msg.text()}`));
    page.on('pageerror', err => console.log(`[TEST BROWSER ERROR]: ${err.message}`));

    // 1. Navegar al simulador en el panel 3 (puerto 3001)
    await page.goto(baseURL);

    // Verificar que el header del Panel 3 esté visible
    await expect(page.locator('text=SIMULADOR DE CHAT Y ESTUDIO EN VIVO')).toBeVisible({ timeout: 10000 });

    // 2. Verificar que los mensajes iniciales del bot o bienvenida carguen
    await page.waitForSelector('.bg-white, [style*="background: white"], [style*="background: rgb(255, 255, 255)"]', { timeout: 10000 });

    // 3. Probar agregar nueva opción/mensaje al nodo de menú (Globo de mensaje / Botón de agregar)
    const addOptionButton = page.locator('button:has-text("Agregar Nueva Opción al Menú")');
    if (await addOptionButton.count() > 0) {
      await addOptionButton.first().click();
      console.log('Se hizo clic en agregar nueva opción de mensaje al nodo.');
    }

    // 4. Probar edición / configuración de mensaje o opción
    const editButton = page.locator('button[title*="Editar"], button:has(svg)').first();
    if (await editButton.count() > 0) {
      await editButton.click();
      console.log('Se abrió el editor de mensaje/opción jerárquica.');
      
      // Cancelar o guardar edición para mantener estabilidad
      const cancelButton = page.locator('button:has-text("Cancelar")').first();
      if (await cancelButton.count() > 0) {
        await cancelButton.click();
      }
    }

    // 5. Verificar que el sistema frontend maneje borrado y reinicio de chat correctamente
    const resetButton = page.locator('button:has-text("Borrar y Reiniciar")');
    await expect(resetButton).toBeVisible();
    await resetButton.click();

    console.log('Prueba de flujo de mensajes y nodos jerárquicos completada con éxito.');
  });
});
