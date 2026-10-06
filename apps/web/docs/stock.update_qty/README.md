# Auditoría Exhaustiva: Comando stock.update_qty

## Resumen de hallazgos

El comando presenta vulnerabilidades críticas. Aunque valida la existencia del producto, no restringe los valores de `newQty` (permite negativos) ni el tipo de dato (permite strings), lo que corrompe la integridad del inventario.

## Casos de Prueba Auditados

### 1. Validación de Errores y Comportamientos

| ID  | Escenario                   | Payload Exacto                                                        | Respuesta Recibida                                               | Estado         |
| :-- | :-------------------------- | :-------------------------------------------------------------------- | :--------------------------------------------------------------- | :------------- |
| 1   | Éxito: Actualización válida | `{"cmd":"stock.update_qty","params":{"code":"OK1","newQty":50}}`      | `{"success":true,...}`                                           | OK             |
| 2   | Error: Producto no existe   | `{"cmd":"stock.update_qty","params":{"code":"NOEXISTE","newQty":50}}` | `{"success":false,"message":"Producto no encontrado",...}`       | OK             |
| 3   | Error: Cantidad negativa    | `{"cmd":"stock.update_qty","params":{"code":"OK1","newQty":-10}}`     | `{"success":true,...}`                                           | **VULNERABLE** |
| 4   | Error: Tipo inválido (str)  | `{"cmd":"stock.update_qty","params":{"code":"OK1","newQty":"diez"}}`  | `{"success":true,...}`                                           | **VULNERABLE** |
| 5   | Error: Campo faltante       | `{"cmd":"stock.update_qty","params":{"code":"OK1"}}`                  | `{"success":false,"message":"code y newQty son requeridos",...}` | OK             |
| 6   | Uso: Cantidad 0             | `{"cmd":"stock.update_qty","params":{"code":"OK1","newQty":0}}`       | `{"success":true,...}`                                           | OK             |
