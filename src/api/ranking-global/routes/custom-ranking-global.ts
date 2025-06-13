// src/api/ranking-global/routes/custom-ranking-global.ts

// Usamos 'any' para el tipado de las políticas y auth.scope para máxima compatibilidad.
interface CustomRouteConfig {
  policies?: any[];
  middlewares?: any[];
  auth?: { scope?: any | any[] | boolean };
}

// Definimos una interfaz para la estructura de nuestras rutas personalizadas.
interface CustomRoute {
  method: 'GET' | 'POST' | 'PUT' | 'DELETE'; // Métodos HTTP permitidos
  path: string; // La ruta URL
  handler: string; // El controlador y método a llamar (ej. 'api::ranking-global.ranking-global.recalcular')
  config?: CustomRouteConfig; // Configuración adicional para la ruta (políticas, etc.)
}

// Exportamos un objeto con una propiedad 'routes' que contiene un array de rutas.
// Strapi detectará este archivo en el directorio 'routes' y registrará estas rutas.
export default {
  routes: [
    {
      // Ruta para recalcular el ranking global manualmente
      method: 'POST', // Es un método POST para activar una acción
      path: '/ranking-global/recalcular', // La URL del endpoint
      handler: 'api::ranking-global.ranking-global.recalcular', // ¡CRUCIAL! Usar el UID COMPLETO del controlador y método.
      config: {
        policies: ['global::is-super-admin'], // Aplicamos la política de Super Admin para proteger la ruta
        auth: {
          scope: ['api::ranking-global.ranking-global.recalcular'], // Registra este permiso en el panel de permisos de Strapi
        },
      },
    },
  ],
};