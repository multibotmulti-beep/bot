import { GuideFlow } from '../components/tour/TourProvider';

export const guides: Record<string, GuideFlow> = {
  newUser: {
    id: 'new-user-guide',
    steps: [
      {
        id: 'step1',
        message: '¡Bienvenido! Empieza creando tu stock.',
        targetSelector: 'button[aria-label="Stock"]',
        triggerEvent: 'navigate_stock',
      },
      {
        id: 'step2',
        message: 'Acá se agrega nuevo producto',
        targetSelector: 'button[style*="position: fixed"]',
        triggerEvent: 'click_add_product',
      },
      {
        id: 'step3',
        message: 'Genera un código aleatorio.',
        targetSelector: 'button.btn-primary',
        triggerEvent: 'click_generate_code',
      },
      {
        id: 'step4',
        message: 'Escribe el nombre del producto.',
        targetSelector: 'input[placeholder="Nombre"]',
        triggerEvent: 'input_product_name',
      },
      {
        id: 'step5',
        message: 'Define el precio.',
        targetSelector: 'input[placeholder="Precio"]',
        triggerEvent: 'input_product_price',
      },
      {
        id: 'step6',
        message: 'Cantidad disponible en stock.',
        targetSelector: 'input[placeholder="Cantidad"]',
        triggerEvent: 'input_product_qty',
      },
      {
        id: 'step7',
        message: 'Categoría del producto (ej: gaseosa).',
        targetSelector: 'input[placeholder="Categoría"]',
        triggerEvent: 'input_product_category',
      },
    ],
  },
  salesTour: {
    id: 'sales-guide',
    steps: [
      {
        id: 'sales_init',
        message: 'Vamos al panel de Ventas.',
        targetSelector: 'button[aria-label="Ventas"]',
        triggerEvent: 'navigate_sales',
      },
      {
        id: 'sales_step1',
        message: 'Selecciona una categoría.',
        targetSelector: '.categories-area button',
        triggerEvent: 'select_category',
      },
      {
        id: 'sales_step2',
        message: 'Toca un producto para venderlo.',
        targetSelector: '.products-area button',
        triggerEvent: 'select_product',
      },
      {
        id: 'sales_step3',
        message: 'Finaliza la venta aquí.',
        targetSelector: 'button.btn-primary',
        triggerEvent: 'click_checkout',
      },
      {
        id: 'sales_step4',
        message: 'Ve a Empleados para ver el ticket.',
        targetSelector: 'button[aria-label="Empleados"]',
        triggerEvent: 'navigate_employees',
      },
      {
        id: 'sales_step5',
        message: 'Toca el ticket para ver los detalles.',
        targetSelector: '.ticket-header',
        triggerEvent: 'expand_ticket',
      },
      {
        id: 'sales_step6',
        message: '¡Aquí está el resumen del ticket!',
        targetSelector: '.ticket-body',
        triggerEvent: 'finish_sales_tour',
      },
    ],
  },
  themeTour: {
    id: 'theme-guide',
    steps: [
      {
        id: 'theme_init',
        message: 'Abre el menú.',
        targetSelector: 'button[aria-label="Menú"]',
        triggerEvent: 'menu_opened',
      },
      {
        id: 'theme_step2',
        message: 'Aquí puedes cambiar el tema.',
        targetSelector: '.theme-container',
        triggerEvent: 'finish_theme_tour',
      },
    ],
  },
  employeeTour: {
    id: 'employee-guide',
    steps: [
      {
        id: 'emp_init',
        message: 'Vamos al panel de Empleados.',
        targetSelector: 'button[aria-label="Empleados"]',
        triggerEvent: 'navigate_employees',
      },
      {
        id: 'emp_step1',
        message: 'Haz clic aquí para añadir un nuevo empleado.',
        targetSelector: 'button.btn-primary',
        triggerEvent: 'click_new_employee',
      },
      {
        id: 'emp_step2',
        message:
          'Define Usuario y Contraseña. Con estos datos el empleado iniciará sesión.',
        targetSelector: 'input[placeholder="Usuario"]',
        triggerEvent: 'input_employee_user',
      },
      {
        id: 'emp_step3',
        message: 'Aquí puedes configurar permisos y tareas.',
        targetSelector: '.tabs',
        triggerEvent: 'select_tabs',
      },
      {
        id: 'emp_step4',
        message:
          'Selecciona este empleado para ver sus ventas o todos los tickets globales.',
        targetSelector: '.sidebar-list',
        triggerEvent: 'view_employee_sales',
      },
    ],
  },
};
