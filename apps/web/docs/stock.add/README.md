# Auditoría Exhaustiva: Comando stock.add

## Resumen de hallazgos

El comando presenta vulnerabilidades críticas en la validación de datos de entrada. Permite el almacenamiento de datos inconsistentes (precios y cantidades negativas, tipos de datos incorrectos) y no valida la unicidad de los códigos de producto, permitiendo duplicados que pueden corromper el inventario.

## Casos de Prueba Auditados

### 1. Validación de Errores

| ID  | Escenario                   | Payload Exacto                                                                                            | Respuesta Recibida                                                                                        | Estado         |
| :-- | :-------------------------- | :-------------------------------------------------------------------------------------------------------- | :-------------------------------------------------------------------------------------------------------- | :------------- |
| 1   | Éxito: Producto válido      | `{"cmd":"stock.add","params":{"code":"OK1","name":"Producto OK","price":10,"qty":10,"category":"Cat1"}}`  | `{"success":true,"message":"Operation successful",...}`                                                   | OK             |
| 2   | Error: Precio negativo      | `{"cmd":"stock.add","params":{"code":"ERR_PRICE","name":"Err","price":-1,"qty":10,"category":"Cat1"}}`    | `{"success":true,"message":"Operation successful",...}`                                                   | **VULNERABLE** |
| 3   | Error: Cantidad negativa    | `{"cmd":"stock.add","params":{"code":"ERR_QTY","name":"Err","price":10,"qty":-1,"category":"Cat1"}}`      | `{"success":true,"message":"Operation successful",...}`                                                   | **VULNERABLE** |
| 4   | Error: Precio tipo inválido | `{"cmd":"stock.add","params":{"code":"ERR_TYPE","name":"Err","price":"diez","qty":10,"category":"Cat1"}}` | `{"success":true,"message":"Operation successful",...}`                                                   | **VULNERABLE** |
| 5   | Error: Campo faltante       | `{"cmd":"stock.add","params":{"name":"Err","price":10,"qty":10,"category":"Cat1"}}`                       | `{"success":false,"message":"Faltan datos obligatorios globales: code, name, price, qty y category",...}` | OK             |

### 2. Casos de Uso y Comportamientos Complejos

| ID  | Escenario             | Payload Exacto                                                                                                                                        | Respuesta Recibida     | Comportamiento                                |
| :-- | :-------------------- | :---------------------------------------------------------------------------------------------------------------------------------------------------- | :--------------------- | :-------------------------------------------- |
| 6   | Metadatos complejos   | `{"cmd":"stock.add","params":{"code":"META1","name":"Prod Meta","price":10,"qty":1,"category":"C","color":"rojo","talla":"XL","material":"algodon"}}` | `{"success":true,...}` | Correcto: mapea parámetros extra a `metadata` |
| 7   | Código largo          | `{"cmd":"stock.add","params":{"code":"CODIGO_MUY_LARGO_...","name":"Prod Largo","price":1,"qty":1,"category":"C"}}`                                   | `{"success":true,...}` | Correcto: acepta códigos largos               |
| 8   | Caracteres especiales | `{"cmd":"stock.add","params":{"code":"CODE!@#$%^&*()_+","name":"Prod Especial","price":1,"qty":1,"category":"C"}}`                                    | `{"success":true,...}` | Correcto: acepta caracteres especiales        |
| 9   | Duplicado de código   | `{"cmd":"stock.add","params":{"code":"OK1","name":"Prod Duplicado","price":99,"qty":99,"category":"C"}}`                                              | `{"success":true,...}` | **VULNERABLE**: Permite duplicar códigos      |
