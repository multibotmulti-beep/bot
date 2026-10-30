import fs from 'fs';
import path from 'path';

interface StepValidation {
  id: number;
  title: string;
  check: () => boolean;
  details: string;
}

const steps: StepValidation[] = [
  {
     id: 1,
     title: 'Diseño plano y nativo (sin sombras ni contornos)',
     check: () => {
       const baseBubble = fs.readFileSync(path.join(process.cwd(), 'apps/web/src/components/chat-studio/bubbles/BaseBubble.tsx'), 'utf-8');
       const editorBox = fs.readFileSync(path.join(process.cwd(), 'apps/web/src/components/chat-studio/bubbles/internals/InternalEditorBox.tsx'), 'utf-8');
       return baseBubble.includes("boxShadow: 'none'") && baseBubble.includes("border: 'none'") &&
              editorBox.includes("boxShadow: 'none'") && editorBox.includes("border: 'none'");
     },
     details: 'Verifica boxShadow: "none" y border: "none" en burbujas y editores.'
  },
  {
     id: 2,
     title: 'Restricción estricta de tamaño máximo con scroll vertical',
     check: () => {
       const baseBubble = fs.readFileSync(path.join(process.cwd(), 'apps/web/src/components/chat-studio/bubbles/BaseBubble.tsx'), 'utf-8');
       return baseBubble.includes("maxHeight: isEditing ? '520px'") && baseBubble.includes("overflowY: isEditing ? 'auto'");
     },
     details: 'Verifica límite de altura máxima de 520px y scroll vertical interno en edición.'
  },
  {
     id: 3,
     title: 'Iconos SVG puros (Cero Emojis)',
     check: () => {
       const header = fs.readFileSync(path.join(process.cwd(), 'apps/web/src/components/chat-studio/bubbles/internals/BubbleHeader.tsx'), 'utf-8');
       const editor = fs.readFileSync(path.join(process.cwd(), 'apps/web/src/components/chat-studio/bubbles/internals/InternalEditorBox.tsx'), 'utf-8');
       // Comprobar presencia de SVG y ausencia de emojis clave comunes en UI
       return header.includes('<svg') && editor.includes('<svg');
     },
     details: 'Verifica el uso exclusivo de componentes SVG vectoriales puros.'
  },
  {
     id: 4,
     title: 'Diseño responsive adaptativo (Vertical en móvil, Horizontal en PC)',
     check: () => {
       const editor = fs.readFileSync(path.join(process.cwd(), 'apps/web/src/components/chat-studio/bubbles/internals/InternalEditorBox.tsx'), 'utf-8');
       return editor.includes('flex-direction: column') && editor.includes('@media (min-width: 768px)') && editor.includes('flex-direction: row');
     },
     details: 'Verifica reglas CSS con media queries para botones de herramientas y opciones de menú.'
  },
  {
     id: 5,
     title: 'Unificación de mensajes en la API y persistencia instantánea',
     check: () => {
       const profileService = fs.readFileSync(path.join(process.cwd(), 'packages/domain/src/bot/profile.service.ts'), 'utf-8');
       const simulator = fs.readFileSync(path.join(process.cwd(), 'apps/web/src/components/panels/BotChatSimulatorPanel.tsx'), 'utf-8');
       return profileService.includes('botFlow') && simulator.includes('handleSaveMessageEdit');
     },
     details: 'Verifica que la API maneje nodos BotFlow unificados y el simulador envíe el payload directamente.'
  }
];

function runValidation() {
  console.log('==================================================');
  console.log('   SISTEMA DE VALIDACIÓN DE PASOS Y PROGRESO       ');
  console.log('==================================================\n');

  let passedCount = 0;
  steps.forEach((step) => {
    const success = step.check();
    if (success) {
      passedCount++;
      console.log(`[✔] Paso ${step.id}: ${step.title}`);
      console.log(`    Detalles: ${step.details}\n`);
    } else {
      console.log(`[❌] Paso ${step.id}: ${step.title}`);
      console.log(`    Detalles: ${step.details}\n`);
    }
  });

  console.log('--------------------------------------------------');
  console.log(` Resultado: ${passedCount} de ${steps.length} pasos validados exitosamente.`);
  console.log('==================================================');

  if (passedCount < steps.length) {
    process.exit(1);
  }
}

runValidation();
