// src/policies/is-club-admin.ts

import { Context as KoaContext } from 'koa';

// Esta política verifica si el usuario autenticado tiene el rol 'Club Admin'.
// Opcionalmente, puede verificar si el recurso (ej. un club o torneo) pertenece a los clubes que administra.
export default async (ctx: KoaContext, config: any, { strapi }: { strapi: any }) => { // strapi: any para compatibilidad
  const user = ctx.state.user; // El usuario autenticado está en ctx.state.user

  if (!user) {
    // Si no hay usuario autenticado, deniega el acceso
    (strapi as any).log.warn('Policy is-club-admin: Acceso denegado. Usuario no autenticado.');
    return false;
  }

  // Obtener los roles del usuario. Asegúrate de que los roles vienen poblados en el usuario.
  // Si no vienen, necesitarías poblar los roles del usuario en el middleware de autenticación
  // o hacer una consulta adicional para obtenerlos.
  const roles = user.roles || [];
  const isClubAdmin = roles.some((role: any) => role.name === 'Club Admin');

  if (!isClubAdmin) {
    // Si el usuario no tiene el rol 'Club Admin', deniega el acceso
    (strapi as any).log.warn(`Policy is-club-admin: Acceso denegado para usuario ${user.id}. No tiene el rol 'Club Admin'.`);
    return false;
  }

  // --- Lógica adicional: Verificar si el recurso pertenece al club del administrador ---
  // Esta parte es opcional y depende de si la ruta procesa un recurso específico (ej. /torneos/:id/...)
  // y si quieres restringir la gestión a solo los clubes que el admin tiene asignados.

  const resourceId = ctx.params?.id; // ID del recurso que se está intentando modificar/acceder

  if (resourceId) {
    let resourceClubId: string | null = null; // Tipado explícito como string o null
    const url = ctx.url;

    // Ejemplo: Si la ruta es para un Torneo (ej. /api/torneos/:id/...)
    if (url.includes('/torneos/')) {
      try {
        const torneo = await (strapi as any).db.query('api::torneo.torneo').findOne({
          where: { id: resourceId },
          populate: ['club'], // Asegúrate de poblar el club
        });
        if (torneo && torneo.club && torneo.club.id) {
          resourceClubId = torneo.club.id.toString();
        } else {
          (strapi as any).log.warn(`Policy is-club-admin: Torneo ${resourceId} no encontrado o sin club asociado.`);
        }
      } catch (error: any) {
        (strapi as any).log.error(`Policy is-club-admin: Error al obtener torneo ${resourceId} para verificar club:`, error.message || error);
        return false; // Error al obtener el recurso, deniega el acceso
      }
    }
    // Puedes añadir más bloques 'else if' aquí para otros Content Types:
    // else if (url.includes('/clubs/')) {
    //   // Si la ruta es directamente sobre un club (ej. PUT /api/clubs/:id)
    //   resourceClubId = resourceId.toString();
    // }
    // else if (url.includes('/jugadores/')) {
    //   // Si la ruta es sobre un jugador, tendrías que obtener el club del jugador
    //   try {
    //     const jugador = await (strapi as any).db.query('api::jugador.jugador').findOne({
    //       where: { id: resourceId },
    //       populate: ['club'],
    //     });
    //     if (jugador && jugador.club && jugador.club.id) {
    //       resourceClubId = jugador.club.id.toString();
    //     }
    //   } catch (error) {
    //     (strapi as any).log.error(`Error al obtener jugador ${resourceId} para verificar club:`, error);
    //     return false;
    //   }
    // }

    if (resourceClubId) {
      // Obtener los IDs de los clubes que este administrador tiene asignados.
      // Asegúrate de que la relación 'clubs' en el usuario del plugin de permisos está populada
      // cuando el usuario se autentica o antes de aplicar esta política.
      const adminClubs = user.clubs || [];
      const adminClubIds = adminClubs.map((club: any) => club.id?.toString()).filter(Boolean); // Asegurar que id existe y filter Boolean

      if (!adminClubIds.includes(resourceClubId)) {
        (strapi as any).log.warn(`Policy is-club-admin: Usuario ${user.id} (Club Admin) intentó acceder a recurso ${resourceId} (Club ${resourceClubId}) no asignado.`);
        return false; // El recurso no pertenece a los clubes que administra
      }
    } else {
        // Si resourceId existe pero no pudimos determinar su club, puede ser un problema.
        // O si la ruta no está cubierta por la lógica de verificación de club.
        // Decide aquí si quieres permitir o denegar por defecto.
        (strapi as any).log.info(`Policy is-club-admin: No se pudo determinar el club para el recurso ${resourceId}.`);
        // return false; // Descomentar para ser más estricto
    }
  } else {
      (strapi as any).log.info('Policy is-club-admin: Ruta sin ID de recurso, no se aplica la verificación de club del recurso.');
  }

  // Si pasa todas las verificaciones, permite el acceso
  (strapi as any).log.info(`Policy is-club-admin: Acceso permitido para usuario ${user.id} (Club Admin).`);
  return true;
};
