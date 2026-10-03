import { chromium } from 'playwright';

async function run() {
  console.log('🚀 Iniciando navegador con Playwright...');
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  const consoleErrors: string[] = [];
  const pageErrors: string[] = [];

  page.on('console', msg => {
    if (msg.type() === 'error') {
      const text = `[CONSOLE ERROR] ${msg.text()}`;
      console.error(text);
      consoleErrors.push(text);
    } else {
      console.log(`[CONSOLE ${msg.type().toUpperCase()}] ${msg.text()}`);
    }
  });

  page.on('pageerror', err => {
    const text = `[PAGE ERROR] ${err.message}`;
    console.error(text);
    pageErrors.push(text);
  });

  try {
    console.log('🌐 Navegando a http://localhost:3000 ...');
    await page.goto('http://localhost:3000', { waitUntil: 'networkidle' });

    console.log('⏳ Esperando carga completa de la página...');
    await page.waitForTimeout(3000);

    console.log('🖱️ Interactuando con las pestañas del menú móvil/desktop...');
    
    // Probar pestaña Admin Bot
    const adminButton = page.locator('button:has-text("Admin Bot")');
    if (await adminButton.count() > 0) {
      await adminButton.click();
      await page.waitForTimeout(2000);
    }

    // Probar pestaña Dashboard
    const dashboardButton = page.locator('button:has-text("Dashboard")');
    if (await dashboardButton.count() > 0) {
      await dashboardButton.click();
      await page.waitForTimeout(2000);
    }

    // Probar pestaña Credenciales
    const credButton = page.locator('button:has-text("Credenciales")');
    if (await credButton.count() > 0) {
      await credButton.click();
      await page.waitForTimeout(2000);
    }

    // Volver a Demo
    const demoButton = page.locator('button:has-text("Demo")');
    if (await demoButton.count() > 0) {
      await demoButton.click();
      await page.waitForTimeout(2000);
    }

    console.log('\n📊 --- RESUMEN DE PRUEBA PLAYWRIGHT ---');
    console.log(`Total Errores de Consola: ${consoleErrors.length}`);
    console.log(`Total Errores de Página: ${pageErrors.length}`);

    if (consoleErrors.length === 0 && pageErrors.length === 0) {
      console.log('✅ ¡La página web cargó y navegó sin ningún error de consola ni excepciones!');
    } else {
      console.log('⚠️ Se encontraron algunos errores detallados arriba.');
    }

  } catch (error: any) {
    console.error('❌ Error durante la ejecución de Playwright:', error.message);
  } finally {
    await browser.close();
  }
}

run();
