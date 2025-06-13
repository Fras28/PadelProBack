// src/api/jugador/lifecycles.ts

// Usaremos aserciones de tipo a 'any' para la instancia global 'strapi' si es necesario.

export default {
    /**
     * Se ejecuta después de que un registro de Jugador ha sido creado.
     * Usado para asegurar que el componente 'estadisticas' se inicialice con valores por defecto.
     * @param {object} event - El objeto de evento que contiene el resultado de la operación y los parámetros.
     */
    async afterCreate(event: { result: any; params: any }) {
      const { result } = event;
  
      // Verificar si el componente 'estadisticas' ya fue inicializado o si necesita serlo
      // Un jugador puede ser creado con estadísticas pre-cargadas si viene de una importación, por ejemplo.
      if (!result.estadisticas) {
        (strapi as any).log.info(`Jugador ${result.id} creado sin estadísticas. Inicializando componente 'estadisticas'...`);
  
        // Valores por defecto para el componente estadisticas
        const defaultStats = {
          partidosJugados: 0,
          partidosGanados: 0,
          torneosJugados: 0,
          torneosGanados: 0,
        };
  
        try {
          // Actualizar el jugador para establecer el componente 'estadisticas' con los valores por defecto
          await (strapi as any).entityService.update(
            'api::jugador.jugador',
            result.id,
            {
              data: {
                estadisticas: defaultStats,
              },
            }
          );
          (strapi as any).log.info(`Componente 'estadisticas' inicializado para el jugador ${result.nombre} ${result.apellido} (ID: ${result.id}).`);
        } catch (error: any) {
          (strapi as any).log.error(`Error al inicializar estadísticas para el jugador ${result.id}:`, error.message || error);
        }
      } else {
        (strapi as any).log.info(`Jugador ${result.id} creado con estadísticas ya presentes. No se requiere inicialización.`);
      }
    },
  
    // Puedes añadir otros lifecycles aquí si son necesarios en el futuro, por ejemplo:
    // async beforeUpdate(event: { params: any }) {
    //   // Lógica antes de actualizar un jugador (ej. validaciones personalizadas)
    //   // const { data, where, select, populate } = event.params;
    // },
  
    // async afterDelete(event: { result: any; params: any }) {
    //   // Lógica después de borrar un jugador (ej. limpiar registros relacionados)
    //   // const { result, params } = event;
    // },
  };