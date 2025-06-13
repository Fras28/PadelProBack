// src/api/torneo/routes/torneo.ts

import { factories } from '@strapi/strapi';

// Este archivo define las rutas CRUD por defecto para el Content Type 'Torneo'.
// Las rutas personalizadas (generar-fixture, inscribir-pareja) se definen en
// 'custom-torneo.ts' en el mismo directorio.
export default factories.createCoreRouter('api::torneo.torneo');