import { BotProfileService } from '@repo/domain';
import { logger } from '@repo/logger';

async function seedBotRules() {
  try {
    console.log('Sembrando perfiles y reglas de bots demo en la base de datos...');
    const result = await BotProfileService.seedDemoProfiles();
    console.log(`¡Perfiles demo sembrados exitosamente! Total: ${result.count}`);
  } catch (error) {
    console.error('Error al sembrar perfiles de bots:', error);
    process.exit(1);
  }
}

seedBotRules();
