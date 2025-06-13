// src/api/torneo/services/torneo.ts

import { factories } from '@strapi/strapi';
// REMOVED: import type { Strapi } from '@strapi/strapi/lib/core/Strapi';
// You can remove the specific Strapi type import to resolve the TypeScript error.
// The 'strapi' object passed to the factory function is generally well-typed
// by Strapi internally, or you can use 'any' if needed.

export default factories.createCoreService('api::torneo.torneo' as any, ({ strapi }: { strapi: any }) => ({ // Using 'any' for strapi type
  /**
   * Lógica para generar el fixture de un torneo dado su ID.
   * @param {number | string} torneoId - El ID del torneo.
   * @returns {Promise<any>} - El fixture generado o la información actualizada del torneo.
   */
  async generarFixture(torneoId: number | string): Promise<any> {
    (strapi as any).log.info(`Service: Generando fixture para el torneo ID: ${torneoId}`);

    // 1. Obtener el torneo
    const torneo = await (strapi as any).entityService.findOne('api::torneo.torneo', torneoId, {
      populate: ['parejas_inscritas', 'parejas_inscritas.jugador1', 'parejas_inscritas.jugador2'],
    });

    if (!torneo) {
      (strapi as any).log.error(`Service: Torneo con ID ${torneoId} no encontrado.`);
      throw new Error(`Torneo con ID ${torneoId} no encontrado.`);
    }

    const parejasInscritas = torneo.parejas_inscritas;

    if (!parejasInscritas || parejasInscritas.length < 2) {
      (strapi as any).log.warn(`Service: No hay suficientes parejas inscritas para generar el fixture en el torneo ${torneoId}. Parejas: ${parejasInscritas?.length || 0}`);
      throw new Error('No hay suficientes parejas inscritas (se requieren al menos 2) para generar el fixture.');
    }

    // 2. Lógica para generar el fixture (simplificado para ejemplo)
    // Aquí iría tu algoritmo real para generar el fixture (ej. emparejamientos, rondas, etc.)
    // Para este ejemplo, simplemente devolvemos un fixture básico.
    const fixture = {
      torneoId: torneo.id,
      nombreTorneo: torneo.nombre,
      estado: torneo.estado,
      parejas: parejasInscritas.map((pareja: any) => ({
        id: pareja.id,
        nombre: pareja.nombrePareja || `Pareja ${pareja.jugador1?.nombre} y ${pareja.jugador2?.nombre}`,
      })),
      partidos: [], // Aquí iría la estructura de los partidos generados
      generadoEn: new Date(),
    };

    // Puedes actualizar el torneo con la información del fixture si tu esquema lo soporta.
    // Por ejemplo, si tuvieras un campo 'fixtureData: json' en tu content type 'torneo'.
    // await (strapi as any).entityService.update('api::torneo.torneo', torneoId, {
    //   data: {
    //     fixtureData: fixture,
    //     estado: 'En Curso', // O el estado apropiado
    //   },
    // });

    (strapi as any).log.info(`Service: Fixture generado exitosamente para el torneo ID: ${torneoId}.`);
    return fixture; // Devolvemos el fixture generado
  },

  /**
   * Lógica para inscribir una pareja (jugador1 y jugador2) en un torneo.
   * @param {number | string} torneoId - El ID del torneo.
   * @param {number | string} jugador1Id - El ID del primer jugador.
   * @param {number | string} jugador2Id - El ID del segundo jugador.
   * @returns {Promise<any>} - La pareja inscrita o actualizada.
   */
  async inscribirPareja(torneoId: number | string, jugador1Id: number | string, jugador2Id: number | string): Promise<any> {
    (strapi as any).log.info(`Service: Inscribiendo pareja (Jugador1: ${jugador1Id}, Jugador2: ${jugador2Id}) en el torneo ID: ${torneoId}`);

    const torneo = await (strapi as any).entityService.findOne('api::torneo.torneo', torneoId, {
      populate: ['parejas_inscritas'],
    });

    if (!torneo) {
      (strapi as any).log.error(`Service: Torneo con ID ${torneoId} no encontrado.`);
      throw new Error(`Torneo con ID ${torneoId} no encontrado.`);
    }

    // 1. Buscar si la pareja ya existe (por jugador1 y jugador2)
    // Asumiendo que 'pareja' tiene campos jugador1 y jugador2 (relaciones)
    let parejaExistente = await (strapi as any).entityService.findMany('api::pareja.pareja', {
      filters: {
        $or: [
          { jugador1: jugador1Id, jugador2: jugador2Id },
          { jugador1: jugador2Id, jugador2: jugador1Id }, // Considerar orden inverso
        ],
      },
    });

    let pareja;
    if (parejaExistente && parejaExistente.length > 0) {
      pareja = parejaExistente[0];
      (strapi as any).log.info(`Service: Pareja existente encontrada (ID: ${pareja.id}).`);
    } else {
      // 2. Crear nueva pareja si no existe
      pareja = await (strapi as any).entityService.create('api::pareja.pareja', {
        data: {
          jugador1: jugador1Id,
          jugador2: jugador2Id,
          nombrePareja: `Padelistas ${jugador1Id}-${jugador2Id}`, // Nombre por defecto o generar uno
        },
      });
      (strapi as any).log.info(`Service: Nueva pareja creada (ID: ${pareja.id}).`);
    }

    // 3. Verificar si la pareja ya está inscrita en este torneo
    const isAlreadyInscrita = (torneo.parejas_inscritas || []).some((p: any) => p.id === pareja.id);
    if (isAlreadyInscrita) {
      (strapi as any).log.warn(`Service: La pareja ${pareja.id} ya está inscrita en el torneo ${torneoId}.`);
      throw new Error('Esta pareja ya está inscrita en el torneo.');
    }

    // 4. Inscribir la pareja al torneo
    const parejasInscritasActualizadas = [...(torneo.parejas_inscritas || []).map((p: any) => p.id), pareja.id];

    await (strapi as any).entityService.update('api::torneo.torneo', torneoId, {
      data: {
        parejas_inscritas: parejasInscritasActualizadas,
      },
    });

    (strapi as any).log.info(`Service: Pareja ${pareja.id} inscrita exitosamente en el torneo ${torneoId}.`);
    return pareja; // Devolvemos la pareja inscrita
  },

  // Puedes añadir otros métodos de servicio específicos para torneos aquí
}));