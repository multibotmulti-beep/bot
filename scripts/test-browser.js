const { chromium } = require('playwright');
const http = require('http');

async function waitForServer(url, timeoutMs = 30000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      await new Promise((resolve, reject) => {
        http.get(url, res => {
          if (res.statusCode < 500) resolve(true);
          else reject(new Error(`Status ${res.statusCode}`));
        }).on('error', reject);
      });
      return true;
    } catch {
      await new Promise(r => setTimeout(r, 1000));
    }
  }
  throw new Error(`Servidor en ${url} no respondió a tiempo.`);
}

async function run() {
  console.log('⏳ Esperando a que Next.js en http://localhost:3000 esté listo...');
  await waitForServer('http://localhost:3000');
  
  console.log('🚀 Iniciando navegador con Playwright...');
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  const consoleErrors = [];
  const pageErrors = [];

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
    await page.goto('http://localhost:3000', { waitUntil: 'domcontentloaded' });

    console.log('⏳ Esperando 5 segundos para que carguen componentes y llamadas API...');
    await page.waitForTimeout(5000);

    console.log('🖱️ Interactuando con las pestañas del menú...');
    
    const adminButton = page.locator('button:has-text("Admin Bot")');
    if (await adminButton.count() > 0) {
      await adminButton.click();
      await page.waitForTimeout(2000);
    }

    const dashboardButton = page.locator('button:has-text("Dashboard")');
    if (await dashboardButton.count() > 0) {
      await dashboardButton.click();
      await page.waitForTimeout(2000);
    }

    const credButton = page.locator('button:has-text("Credenciales")');
    if (await credButton.count() > 0) {
      await credButton.click();
      await page.waitForTimeout(2000);
    }

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

  } catch (error) {
    console.error('❌ Error durante la ejecución de Playwright:', error.message);
  } finally {
    await browser.close();
  }
}

run();
