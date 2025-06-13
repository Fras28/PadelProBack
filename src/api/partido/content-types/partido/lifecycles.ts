// src/api/partido/lifecycles.ts

declare const strapi: any; // Add this line to declare the global strapi object

export default {
  /**
   * Se ejecuta después de que un registro de Partido ha sido actualizado.
   * Usado para calcular puntos y actualizar rankings cuando el partido finaliza.
   * Ahora, los puntos se obtienen dinámicamente del Content Type 'Tipo Torneo Puntos'.
   * @param {object} event - El objeto de evento que contiene el resultado de la operación y los parámetros.
   */
  async afterUpdate(event: { result: any; params: any }) {
    const { result, params } = event;

    // Solo procede si el estado del partido es 'Finalizado' y hay un ganador (o WO)
    if (result.estado === 'Finalizado' && result.ganador) {
      (strapi as any).log.info(`Partido ${result.id} finalizado, iniciando cálculo de puntos y actualización de rankings...`);

      const partidoId = result.id;

      // Obtener el partido con sus relaciones completas para acceder a todos los datos necesarios.
      // Es crucial poblar profundamente para acceder a los jugadores dentro de las parejas.
      const partidoConRelaciones = await (strapi as any).db.query('api::partido.partido').findOne({
        where: { id: partidoId },
        populate: {
          torneo: true, // Popula el torneo para acceder a su tipo
          pareja1: { populate: ['jugador1', 'jugador2'] },
          pareja2: { populate: ['jugador1', 'jugador2'] },
          ganador: { populate: ['jugador1', 'jugador2'] },
          perdedor: { populate: ['jugador1', 'jugador2'] },
        },
      });

      if (!partidoConRelaciones) {
        (strapi as any).log.error(`No se encontró el partido con ID ${partidoId} después de la actualización.`);
        return;
      }

      const { torneo, ganador, perdedor, ronda } = partidoConRelaciones;

      if (!torneo) {
        (strapi as any).log.warn(`Partido ${partidoId} no tiene un torneo asociado. No se pueden calcular puntos.`);
        return;
      }

      // 1. Obtener los puntos configurados para el tipo de torneo y la ronda
      const tipoTorneoPuntos = await (strapi as any).entityService.findMany('api::tipo-torneo-punto.tipo-torneo-punto', {
        filters: {
          tipoTorneo: torneo.tipoTorneo,
          ronda: ronda, // Asume que 'ronda' es un campo de texto exacto
          // Puedes añadir un filtro por género si tu torneo lo tiene (ej. 'Masculino', 'Femenino', 'Mixto')
          // genero: torneo.genero,
        },
      });

      let puntosGanador = 0;
      let puntosPerdedor = 0;

      if (tipoTorneoPuntos && tipoTorneoPuntos.length > 0) {
        puntosGanador = tipoTorneoPuntos[0].puntosGanador;
        puntosPerdedor = tipoTorneoPuntos[0].puntosPerdedor;
        (strapi as any).log.info(`Puntos configurados para este partido: Ganador = ${puntosGanador}, Perdedor = ${puntosPerdedor}`);
      } else {
        (strapi as any).log.warn(`No se encontraron configuraciones de puntos para el tipo de torneo "${torneo.tipoTorneo}" y ronda "${ronda}". Se usarán 0 puntos.`);
      }

      // 2. Actualizar puntos de ranking y estadísticas de jugadores
      const jugadoresAfectados = new Set();
      if (ganador?.jugador1) jugadoresAfectados.add(ganador.jugador1);
      if (ganador?.jugador2) jugadoresAfectados.add(ganador.jugador2);
      if (perdedor?.jugador1) jugadoresAfectados.add(perdedor.jugador1);
      if (perdedor?.jugador2) jugadoresAfectados.add(perdedor.jugador2);

      // Obtener el registro del Ranking Global (Single Type)
      // Usar findOne para Single Type, ya que solo debe haber uno o ninguno.
      const rankingGlobalRecord = await (strapi as any).entityService.findMany('api::ranking-global.ranking-global', {
        populate: {
          entradasRankingGlobal: {
            populate: ['jugador'], // Popula el jugador dentro de las entradas del ranking
          },
        },
      });

      // Crucial: Asegurarse de que el rankingGlobalRecord existe y es el objeto esperado
      const rankingGlobal = rankingGlobalRecord ? rankingGlobalRecord[0] : null;


      // Si no existe un registro de ranking global, crea uno vacío para evitar errores.
      if (!rankingGlobal) {
        (strapi as any).log.warn('No se encontró un registro de Ranking Global. Creando uno nuevo si es necesario...');
        // Consider creating a default ranking global record here if it's expected to always exist.
        // For now, if it's null, we'll just log and continue, points won't be applied to global ranking.
      }

      for (const jugador of Array.from(jugadoresAfectados) as any[]) {
        if (!jugador) continue; // Saltar si el jugador es nulo o indefinido

        // Obtener las estadísticas actuales del jugador
        // Asegúrate de que 'estadisticas' está poblado en la consulta inicial del jugador si es necesario.
        // O si ya está en el objeto 'jugador' que viene del 'partidoConRelaciones'.
        let stats = jugador.estadisticas || {
          partidosJugados: 0,
          partidosGanados: 0,
          torneosJugados: 0,
          torneosGanados: 0,
        };

        let jugadorActualizado = { ...jugador }; // Crear una copia para modificar

        // Actualizar estadísticas del jugador
        stats.partidosJugados += 1;
        if (ganador && (ganador.jugador1?.id === jugador.id || ganador.jugador2?.id === jugador.id)) {
          stats.partidosGanados += 1;
        }

        // Actualizar los puntos globales del jugador en el ranking global
        // Esto solo se hace si el rankingGlobal existe y tiene entradas
        if (rankingGlobal && rankingGlobal.entradasRankingGlobal) {
          let entradaGlobalDelJugador = rankingGlobal.entradasRankingGlobal.find((e: any) => e.jugador?.id === jugador.id);

          if (entradaGlobalDelJugador) {
            // Si el jugador ya tiene una entrada en el ranking global
            if (ganador && (ganador.jugador1?.id === jugador.id || ganador.jugador2?.id === jugador.id)) {
              entradaGlobalDelJugador.puntosGlobales = (entradaGlobalDelJugador.puntosGlobales || 0) + puntosGanador;
            } else {
              entradaGlobalDelJugador.puntosGlobales = (entradaGlobalDelJugador.puntosGlobales || 0) + puntosPerdedor;
            }
            (strapi as any).log.info(`Puntos globales actualizados para ${jugador.nombre}: ${entradaGlobalDelJugador.puntosGlobales}`);
          } else {
            // Si el jugador no tiene una entrada, crear una nueva
            const nuevosPuntos = (ganador && (ganador.jugador1?.id === jugador.id || ganador.jugador2?.id === jugador.id))
              ? puntosGanador
              : puntosPerdedor;

            entradaGlobalDelJugador = {
              jugador: jugador.id, // Referencia al jugador
              puntosGlobales: nuevosPuntos,
              posicionGlobal: 0, // La posición se recalculará al final
            };
            rankingGlobal.entradasRankingGlobal.push(entradaGlobalDelJugador);
            (strapi as any).log.info(`Nueva entrada en ranking global para ${jugador.nombre} con ${nuevosPuntos} puntos.`);
          }

          // Asignar los puntos globales actualizados al campo 'rankingGeneral' del jugador
          jugadorActualizado.rankingGeneral = entradaGlobalDelJugador.puntosGlobales;

        } else {
            (strapi as any).log.warn(`No se pudo actualizar el ranking global para el jugador ${jugador.nombre} porque el registro de Ranking Global no existe o no tiene entradas.`);
        }

        // Guardar las estadísticas y el rankingGeneral actualizados del jugador
        await (strapi as any).entityService.update(
          'api::jugador.jugador',
          jugador.id,
          {
            data: {
              estadisticas: stats,
              rankingGeneral: jugadorActualizado.rankingGeneral, // Actualiza también el campo del jugador
            }
          }
        );
        (strapi as any).log.info(`Estadísticas y rankingGeneral actualizados para el jugador "${jugador.nombre} ${jugador.apellido}" (ID: ${jugador.id})`);
      }

      // Después de actualizar todos los jugadores, recalcular las posiciones del ranking global y guardarlo
      if (rankingGlobal && rankingGlobal.entradasRankingGlobal) {
        // Ordenar las entradas por puntos para determinar la posición
        rankingGlobal.entradasRankingGlobal.sort((a: any, b: any) => b.puntosGlobales - a.puntosGlobales);

        // Asignar posiciones
        rankingGlobal.entradasRankingGlobal.forEach((entrada: any, index: number) => {
          entrada.posicionGlobal = index + 1;
        });

        // Actualizar el registro del Ranking Global en la base de datos
        await (strapi as any).entityService.update(
          'api::ranking-global.ranking-global',
          rankingGlobal.id, // ID del registro del Single Type
          {
            data: {
              fechaActualizacion: new Date(),
              entradasRankingGlobal: rankingGlobal.entradasRankingGlobal,
            },
          }
        );
        (strapi as any).log.info('Ranking Global actualizado y posiciones recalculadas.');
      }


    } else {
      // Si el partido no está en estado 'Finalizado' o no tiene un ganador, no se realiza ninguna acción de puntos/rankings.
      (strapi as any).log.info(`Partido ${result.id} actualizado, pero no está en estado 'Finalizado' o no tiene ganador. No se aplicarán puntos ni se actualizarán rankings.`);
    }
  },
};