import { prisma } from '@repo/database';

async function clear() {
  console.log('Eliminando bots demo y precargados de la base de datos...');
  const deleted = await prisma.botProfile.deleteMany({
    where: {
      botId: { not: 'admin' },
    },
  });
  console.log(`¡Eliminados ${deleted.count} bots demo! Ahora la base de datos no tiene bots precargados.`);
}

clear().catch(console.error);
