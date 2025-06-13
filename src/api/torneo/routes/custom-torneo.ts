// src/api/torneo/routes/01-custom-actions.ts

// Este archivo define rutas personalizadas que no extienden directamente el core router.
// Esto a menudo resuelve problemas de registro con el plugin de permisos.

// Usamos 'any' para el tipado de las políticas y auth.scope para máxima compatibilidad
// con las diversas formas en que Strapi puede esperar estos valores en diferentes versiones,
// evitando errores de TypeScript y problemas de registro en el panel de admin.
interface CustomRouteConfig {
  policies?: any[];
  middlewares?: any[];
  auth?: { scope?: any | any[] | boolean };
}

// Definimos una interfaz para la estructura de nuestras rutas personalizadas.
interface CustomRoute {
  method: 'GET' | 'POST' | 'PUT' | 'DELETE'; // Métodos HTTP permitidos
  path: string; // La ruta URL
  handler: string; // El controlador y método a llamar (ej. 'api::torneo.torneo.generarFixture')
  config?: CustomRouteConfig; // Configuración adicional para la ruta (políticas, etc.)
}

// Exportamos un array de rutas directamente. Strapi escaneará este array para registrar las rutas.
const customTorneoRoutes: CustomRoute[] = [
  {
    // Ruta para generar el fixture de un torneo
    method: 'POST', // Es un método POST para activar una acción
    path: '/torneos/:id/generar-fixture', // La URL del endpoint, con ':id' para el ID del torneo
    handler: 'api::torneo.torneo.generarFixture', // ¡CRUCIAL! Usar el UID COMPLETO del controlador y método.
    config: {
      policies: ['global::is-club-admin'], // Aplicamos la política de Club Admin para proteger la ruta
      auth: {
        scope: ['api::torneo.torneo.generarFixture'], // Registra este permiso en el panel de Strapi
      },
    },
  },
  {
    // Ruta para inscribir una pareja en un torneo
    method: 'POST', // Es un método POST para activar una acción
    path: '/torneos/:id/inscribir-pareja', // La URL del endpoint, con ':id' para el ID del torneo
    handler: 'api::torneo.torneo.inscribirPareja', // ¡CRUCIAL! Usar el UID COMPLETO del controlador y método.
    config: {
      policies: ['global::is-club-admin'], // Aplicamos la política de Club Admin para proteger la ruta
      auth: {
        scope: ['api::torneo.torneo.inscribirPareja'], // Registra este permiso en el panel de Strapi
      },
    },
  },
];

export default {
  routes: customTorneoRoutes,
};