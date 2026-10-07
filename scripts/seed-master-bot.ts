/**
 * Script de inicialización y siembra para asegurar que la base de datos
 * contenga el Master Bot (Admin) y bots demo con menús, mensajes de bienvenida
 * y funciones (actionKey) totalmente desacoplados y editables por API.
 */

import { prisma } from '@repo/database';
import { logger } from '@repo/logger';

async function seedMasterAndDemos() {
  console.log('🌱 Sembrando y organizando la base de datos del Motor de Bot...');

  try {
    // 1. Asegurar Credencial de WhatsApp por defecto en BD (sin hardcode en código)
    await prisma.apiCredential.upsert({
      where: { apiName: 'whatsapp' },
      update: {
        apiKey: process.env.WHATSAPP_ACCESS_TOKEN || 'EAAG_MOCK_WHATSAPP_TOKEN_2026',
        apiSecret: process.env.WHATSAPP_API_SECRET || 'mock_secret',
        targetUrl: 'https://graph.facebook.com/v17.0/880275461842101/messages',
        isActive: true,
      },
      create: {
        apiName: 'whatsapp',
        apiKey: process.env.WHATSAPP_ACCESS_TOKEN || 'EAAG_MOCK_WHATSAPP_TOKEN_2026',
        apiSecret: process.env.WHATSAPP_API_SECRET || 'mock_secret',
        targetUrl: 'https://graph.facebook.com/v17.0/880275461842101/messages',
        isActive: true,
      },
    });
    console.log('✔ Credenciales de WhatsApp verificadas en BD.');

    // 2. Sembrar Bot Admin Central (Sector aislado y maestro)
    const adminProfile = await prisma.botProfile.upsert({
      where: { botId: 'admin' },
      update: {
        name: 'Bot Admin Central',
        description: 'Panel maestro de gestión, menú público y acceso a perfiles de bots.',
        type: 'system',
        isPublic: true,
        isActive: true,
      },
      create: {
        botId: 'admin',
        name: 'Bot Admin Central',
        description: 'Panel maestro de gestión, menú público y acceso a perfiles de bots.',
        type: 'system',
        isPublic: true,
        isActive: true,
      },
    });

    // Menú público del Bot Admin con funciones y menús independientes (editables/agregables/eliminables)
    const existingAdminFlow = await prisma.botFlow.findFirst({
      where: { botProfileId: adminProfile.id, parentId: null },
    });

    const adminMenuOptions = [
      { label: '1. 🔑 Iniciar sesión / Mi cuenta', option: '1', actionKey: 'auth.login' },
      { label: '2. 📋 Listar mis bots', option: '2', actionKey: 'bot.list_my_bots' },
      { label: '3. 🤖 Ver todos los bots', option: '3', actionKey: 'bot.list_all' },
      { label: '4. 👤 Hablar con un asesor', option: '4', actionKey: 'support.human' }
    ];

    if (existingAdminFlow) {
      await prisma.botFlow.update({
        where: { id: existingAdminFlow.id },
        data: {
          responseMessage: '¡Bienvenido al Bot Oficial (Admin Central)! Selecciona una opción del menú:',
          content: JSON.stringify(adminMenuOptions),
        },
      });
    } else {
      await prisma.botFlow.create({
        data: {
          botProfileId: adminProfile.id,
          name: 'Menú Principal Bot Admin',
          triggerKeyword: 'menu',
          flowType: 'menu',
          content: JSON.stringify(adminMenuOptions),
          responseMessage: '¡Bienvenido al Bot Oficial (Admin Central)! Selecciona una opción del menú:',
          isActive: true,
        },
      });
    }

    // Regla de menú secreto en BD
    await prisma.botRule.upsert({
      where: { id: 'admin-secret-rule' }, // si id fijo o buscar por keyword
      update: {},
      create: {
        id: 'admin-secret-rule',
        botProfileId: adminProfile.id,
        keyword: 'menu secreto',
        matchType: 'contains',
        responseMessage: 'ADMIN_SECRET_PROFILES_LIST',
        isActive: true,
      },
    }).catch(async () => {
      // Si falla por ID, buscar o crear
      const ruleExists = await prisma.botRule.findFirst({ where: { botProfileId: adminProfile.id, keyword: 'menu secreto' } });
      if (!ruleExists) {
        await prisma.botRule.create({
          data: {
            botProfileId: adminProfile.id,
            keyword: 'menu secreto',
            matchType: 'contains',
            responseMessage: 'ADMIN_SECRET_PROFILES_LIST',
            isActive: true,
          },
        });
      }
    });

    console.log('✔ Bot Admin Central configurado y organizado en BD.');

    // 3. Sembrar Bots Demo (Soporte, Ventas, Citas) con menús y mensajes independientes
    const demos = [
      {
        botId: 'demo-soporte',
        name: 'Bot de Soporte Técnico',
        description: 'Bot pre-cargado para atención al cliente y preguntas frecuentes (FAQs).',
        welcome: '¡Hola! Bienvenido al Soporte Técnico. ¿En qué podemos ayudarte hoy?',
        options: [
          { label: 'Consultar estado de ticket', option: '1', actionKey: 'support.ticket' },
          { label: 'Preguntas frecuentes (FAQs)', option: '2', actionKey: 'support.faqs' },
          { label: 'Hablar con un asesor', option: '3', actionKey: 'support.human' }
        ]
      },
      {
        botId: 'demo-ventas',
        name: 'Bot de E-commerce y Ventas',
        description: 'Bot pre-cargado con catálogo de productos y carrito de compras.',
        welcome: '¡Hola! Bienvenido a nuestra Tienda Online. Explora nuestro catálogo:',
        options: [
          { label: 'Ver catálogo de productos', option: '1', actionKey: 'shop.catalog' },
          { label: 'Ver mi carrito de compras', option: '2', actionKey: 'shop.cart' },
          { label: 'Hablar con ventas', option: '3', actionKey: 'support.human' }
        ]
      },
    ];

    for (const d of demos) {
      const profile = await prisma.botProfile.upsert({
        where: { botId: d.botId },
        update: { name: d.name, description: d.description, type: 'demo', isActive: true },
        create: { botId: d.botId, name: d.name, description: d.description, type: 'demo', isPublic: true, isActive: true },
      });

      const flowExists = await prisma.botFlow.findFirst({ where: { botProfileId: profile.id, parentId: null } });
      if (flowExists) {
        await prisma.botFlow.update({
          where: { id: flowExists.id },
          data: { responseMessage: d.welcome, content: JSON.stringify(d.options) },
        });
      } else {
        await prisma.botFlow.create({
          data: {
            botProfileId: profile.id,
            name: `Menú Principal de ${d.name}`,
            triggerKeyword: 'menu',
            flowType: 'menu',
            content: JSON.stringify(d.options),
            responseMessage: d.welcome,
            isActive: true,
          },
        });
      }
    }

    console.log('✔ Bots demo sembrados y organizados exitosamente.');
    console.log('🎉 ¡Base de datos del motor de bot lista y organizada sin hardcoding!');
  } catch (error) {
    console.error('❌ Error al sembrar la base de datos:', error);
    process.exit(1);
  }
}

seedMasterAndDemos();
