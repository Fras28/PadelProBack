// src/api/partido/lifecycles.ts

declare const strapi: any;

export default {
  async afterUpdate(event: { result: any; params: any }) {
    const { result, params } = event;

    if (result.estado === 'Finalizado' && result.ganador) {
      (strapi as any).log.info(`Partido ${result.id} finalizado, iniciando cálculo de puntos y actualización de rankings...`);

      const partidoId = result.id;

      const partidoConRelaciones = await (strapi as any).db.query('api::partido.partido').findOne({
        where: { id: partidoId },
        populate: {
          torneo: true,
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

      const tipoTorneoPuntos = await (strapi as any).entityService.findMany('api::tipo-torneo-punto.tipo-torneo-punto', {
        filters: {
          tipoTorneo: torneo.tipoTorneo,
          ronda: ronda,
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

      const jugadoresAfectados = new Set();
      if (ganador?.jugador1) jugadoresAfectados.add(ganador.jugador1);
      if (ganador?.jugador2) jugadoresAfectados.add(ganador.jugador2);
      if (perdedor?.jugador1) jugadoresAfectados.add(perdedor.jugador1);
      if (perdedor?.jugador2) jugadoresAfectados.add(perdedor.jugador2);

      let rankingGlobal = await (strapi as any).entityService.findOne('api::ranking-global.ranking-global', 1, {
        populate: {
          entradasRankingGlobal: {
            populate: ['jugador'],
          },
        },
      });

      if (!rankingGlobal) {
        (strapi as any).log.warn('No se encontró un registro de Ranking Global. Creando uno nuevo...');
        rankingGlobal = await (strapi as any).entityService.create('api::ranking-global.ranking-global', {
          data: {
            fechaActualizacion: new Date(),
            entradasRankingGlobal: [],
          },
        });
        (strapi as any).log.info('Nuevo registro de Ranking Global creado con éxito.');
      }

      if (!rankingGlobal.entradasRankingGlobal) {
        rankingGlobal.entradasRankingGlobal = [];
      }

      // ** Nuevo array para construir las entradas de ranking actualizadas **
      // Esto es crucial para manejar las IDs de componentes repetibles correctamente.
      const updatedEntradasRankingGlobal: any[] = [...rankingGlobal.entradasRankingGlobal];

      for (const jugador of Array.from(jugadoresAfectados) as any[]) {
        if (!jugador) continue;

        let stats = jugador.estadisticas || {
          partidosJugados: 0,
          partidosGanados: 0,
          torneosJugados: 0,
          torneosGanados: 0,
        };

        stats.partidosJugados += 1;
        if (ganador && (ganador.jugador1?.id === jugador.id || ganador.jugador2?.id === jugador.id)) {
          stats.partidosGanados += 1;
        }

        // Buscar el índice de la entrada del jugador en el array auxiliar
        const existingEntryIndex = updatedEntradasRankingGlobal.findIndex((e: any) => e.jugador?.id === jugador.id);
        
        let currentPuntosGlobales = 0; // Inicializar en 0 para nuevos jugadores o si no se encuentran

        if (existingEntryIndex !== -1) {
            // El jugador ya tiene una entrada en el ranking global
            const entradaExistente = updatedEntradasRankingGlobal[existingEntryIndex];
            currentPuntosGlobales = entradaExistente.puntosGlobales || 0; // Obtener puntos actuales
            
            if (ganador && (ganador.jugador1?.id === jugador.id || ganador.jugador2?.id === jugador.id)) {
                entradaExistente.puntosGlobales = currentPuntosGlobales + puntosGanador;
            } else {
                entradaExistente.puntosGlobales = currentPuntosGlobales + puntosPerdedor;
            }
            (strapi as any).log.info(`Puntos globales actualizados para ${jugador.nombre}: ${entradaExistente.puntosGlobales} (ID de entrada: ${entradaExistente.id || 'nueva'})`);
        } else {
            // Si el jugador no tiene una entrada, crear una nueva (sin 'id' inicialmente)
            const nuevosPuntos = (ganador && (ganador.jugador1?.id === jugador.id || ganador.jugador2?.id === jugador.id))
                ? puntosGanador
                : puntosPerdedor;

            const nuevaEntrada = {
                jugador: jugador.id,
                puntosGlobales: nuevosPuntos,
                posicionGlobal: 0, // Se recalculará al final
            };
            updatedEntradasRankingGlobal.push(nuevaEntrada);
            (strapi as any).log.info(`Nueva entrada en ranking global para ${jugador.nombre} con ${nuevosPuntos} puntos.`);
        }

        // Asignar los puntos globales actualizados al campo 'rankingGeneral' del jugador
        // Asegúrate de que `jugador.rankingGeneral` es un número decimal en tu schema
        // Si el jugador era nuevo en el ranking, usamos los puntos que se le asignaron
        const puntosParaJugador = existingEntryIndex !== -1 
            ? updatedEntradasRankingGlobal[existingEntryIndex].puntosGlobales 
            : (ganador && (ganador.jugador1?.id === jugador.id || ganador.jugador2?.id === jugador.id) ? puntosGanador : puntosPerdedor);

        await (strapi as any).entityService.update(
          'api::jugador.jugador',
          jugador.id,
          {
            data: {
              estadisticas: stats,
              rankingGeneral: puntosParaJugador, // Actualiza el campo rankingGeneral del jugador
            }
          }
        );
        (strapi as any).log.info(`Estadísticas y rankingGeneral actualizados para el jugador "${jugador.nombre} ${jugador.apellido}" (ID: ${jugador.id})`);
      }

      // Después de procesar todos los jugadores, recalcular las posiciones y guardar el Ranking Global.
      // Usa el array `updatedEntradasRankingGlobal` que ahora contiene todas las entradas (existentes con ID, nuevas sin ID).
      updatedEntradasRankingGlobal.sort((a: any, b: any) => b.puntosGlobales - a.puntosGlobales);

      updatedEntradasRankingGlobal.forEach((entrada: any, index: number) => {
        entrada.posicionGlobal = index + 1;
      });

      await (strapi as any).entityService.update(
        'api::ranking-global.ranking-global',
        rankingGlobal.id,
        {
          data: {
            fechaActualizacion: new Date(),
            entradasRankingGlobal: updatedEntradasRankingGlobal, // ¡Usar el array actualizado!
          },
        }
      );
      (strapi as any).log.info('Ranking Global actualizado y posiciones recalculadas.');
    } else {
      (strapi as any).log.info(`Partido ${result.id} actualizado, pero no está en estado 'Finalizado' o no tiene ganador. No se aplicarán puntos ni se actualizarán rankings.`);
    }
  },
};