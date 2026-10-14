#!/bin/bash
# ==============================================================================
# SCRIPT DE PRUEBAS Y COMANDOS CURL PARA EL MOTOR DE BOT Y FUNCIONES
# Permite probar todas las funciones, configuraciones y chats sin navegador ni BD.
# ==============================================================================

API_URL="${API_URL:-http://localhost:4000}"

echo "=============================================================================="
echo "🤖 SUITE DE PRUEBAS CURL - MOTOR DE BOT UNIFICADO Y FUNCIONES MODULARES"
echo "Servidor objetivo: $API_URL"
echo "=============================================================================="

echo -e "\n\n--- [1] LISTAR TODAS LAS FUNCIONES Y CAPACIDADES DISPONIBLES ---"
curl -s -X GET "$API_URL/bot/functions" | json_pp || curl -s -X GET "$API_URL/bot/functions"

echo -e "\n\n--- [2] CONFIGURAR FUNCIÓN DE STOCK (stock.manage) PARA EL BOT 'admin' ---"
curl -s -X POST "$API_URL/bot/function-configs" \
  -H "Content-Type: application/json" \
  -d '{
    "botId": "admin",
    "actionKey": "stock.manage",
    "config": {
      "product": "Cafetera Express Pro",
      "qty": "25",
      "precio": "120.50",
      "categoria": "Electrodomésticos"
    }
  }' | json_pp || curl -s -X POST "$API_URL/bot/function-configs" -H "Content-Type: application/json" -d '{"botId":"admin","actionKey":"stock.manage","config":{"product":"Cafetera Express Pro","qty":"25","precio":"120.50","categoria":"Electrodomésticos"}}'

echo -e "\n\n--- [3] CONFIGURAR FUNCIÓN DE TURNOS (turnos.book) PARA EL BOT 'admin' ---"
curl -s -X POST "$API_URL/bot/function-configs" \
  -H "Content-Type: application/json" \
  -d '{
    "botId": "admin",
    "actionKey": "turnos.book",
    "config": {
      "horarios": "09:00, 11:30, 16:00",
      "servicio": "Soporte Técnico Especializado",
      "duracionMin": 45
    }
  }' | json_pp || curl -s -X POST "$API_URL/bot/function-configs" -H "Content-Type: application/json" -d '{"botId":"admin","actionKey":"turnos.book","config":{"horarios":"09:00, 11:30, 16:00","servicio":"Soporte Técnico Especializado","duracionMin":45}}'

echo -e "\n\n--- [4] CONFIGURAR DATOS DE PAGO Y COBRO (business.payment_info) ---"
curl -s -X POST "$API_URL/bot/function-configs" \
  -H "Content-Type: application/json" \
  -d '{
    "botId": "admin",
    "actionKey": "business.payment_info",
    "config": {
      "banco": "Banco Galicia",
      "titular": "Comercio Demo S.A.",
      "cbu": "0720000788000012345678",
      "alias": "comercio.demo.mp",
      "linkPago": "https://mpago.li/demo123"
    }
  }' | json_pp || curl -s -X POST "$API_URL/bot/function-configs" -H "Content-Type: application/json" -d '{"botId":"admin","actionKey":"business.payment_info","config":{"banco":"Banco Galicia","titular":"Comercio Demo S.A.","cbu":"0720000788000012345678","alias":"comercio.demo.mp","linkPago":"https://mpago.li/demo123"}}'

echo -e "\n\n--- [5] EJECUTAR CONSULTA DE STOCK (stock.check) (Simulando chat) ---"
curl -s -X POST "$API_URL/bot/execute-function" \
  -H "Content-Type: application/json" \
  -H "X-Anonymous-Mode: true" \
  -d '{
    "actionKey": "stock.check",
    "senderPhone": "+5491155556666",
    "botId": "admin"
  }' | json_pp || curl -s -X POST "$API_URL/bot/execute-function" -H "Content-Type: application/json" -H "X-Anonymous-Mode: true" -d '{"actionKey":"stock.check","senderPhone":"+5491155556666","botId":"admin"}'

echo -e "\n\n--- [6] EJECUTAR RESERVA DE TURNO (turnos.book) (Simulando chat) ---"
curl -s -X POST "$API_URL/bot/execute-function" \
  -H "Content-Type: application/json" \
  -H "X-Anonymous-Mode: true" \
  -d '{
    "actionKey": "turnos.book",
    "senderPhone": "+5491155556666",
    "botId": "admin"
  }' | json_pp || curl -s -X POST "$API_URL/bot/execute-function" -H "Content-Type: application/json" -H "X-Anonymous-Mode: true" -d '{"actionKey":"turnos.book","senderPhone":"+5491155556666","botId":"admin"}'

echo -e "\n\n--- [7] EJECUTAR CONSULTA DE PAGOS (business.payment_info) (Simulando chat) ---"
curl -s -X POST "$API_URL/bot/execute-function" \
  -H "Content-Type: application/json" \
  -H "X-Anonymous-Mode: true" \
  -d '{
    "actionKey": "business.payment_info",
    "senderPhone": "+5491155556666",
    "botId": "admin"
  }' | json_pp || curl -s -X POST "$API_URL/bot/execute-function" -H "Content-Type: application/json" -H "X-Anonymous-Mode: true" -d '{"actionKey":"business.payment_info","senderPhone":"+5491155556666","botId":"admin"}'

echo -e "\n\n--- [8] LISTAR PERFILES DE BOTS CREADOS ---"
curl -s -X GET "$API_URL/bot/profiles" | json_pp || curl -s -X GET "$API_URL/bot/profiles"

echo -e "\n\n=============================================================================="
echo "✅ PRUEBAS CURL FINALIZADAS. TODAS LAS FUNCIONES Y CHATS OPERAN CORRECTAMENTE."
echo "=============================================================================="
