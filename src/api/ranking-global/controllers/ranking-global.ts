// src/api/ranking-global/controllers/ranking-global.ts

import { factories } from '@strapi/strapi';
import { Context as KoaContext } from 'koa'; // Importamos Context de koa para tipar ctx

export default factories.createCoreController('api::ranking-global.ranking-global' as any, ({ strapi }: { strapi: any }) => ({
  /**
   * Acción personalizada para recalcular el ranking global.
   * POST /api/ranking-global/recalcular
   * @param {KoaContext} ctx - Contexto de Koa.
   */
  async recalcular(ctx: KoaContext) {
    try {
      // Aquí va la lógica para recalcular el ranking global.
      // Puedes acceder a los servicios de Strapi así: strapi.service('api::ranking-global.ranking-global');
      // Por ahora, solo un mensaje de prueba:
      (strapi as any).log.info('Recalcular Ranking Global: Método invocado.');

      // Ejemplo de cómo podrías interactuar con el servicio de ranking-global
      // const rankingService = strapi.service('api::ranking-global.ranking-global');
      // const recalculatedData = await rankingService.someRecalculationMethod();

      return ctx.send({
        message: 'Lógica de recalcular ranking global en construcción o completada.',
        // data: recalculatedData // Si tuvieras datos que devolver
      });
    } catch (err: any) {
      (strapi as any).log.error('Error al recalcular el ranking global:', err);
      return ctx.internalServerError(`Error al recalcular el ranking global: ${err.message || err}`);
    }
  },
}));
