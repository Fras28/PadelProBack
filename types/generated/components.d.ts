import type { Schema, Struct } from '@strapi/strapi';

export interface JugadorEstadisticas extends Struct.ComponentSchema {
  collectionName: 'components_jugador_estadisticas';
  info: {
    displayName: 'Estadisticas';
    icon: 'user';
  };
  attributes: {
    partidosGanados: Schema.Attribute.BigInteger;
    partidosJugados: Schema.Attribute.BigInteger;
    torneosGanados: Schema.Attribute.BigInteger;
    torneosJugados: Schema.Attribute.BigInteger;
  };
}

export interface RankingCategoriaEntradaRanking extends Struct.ComponentSchema {
  collectionName: 'components_ranking_categoria_entrada_rankings';
  info: {
    displayName: 'Entrada Ranking';
    icon: 'bulletList';
  };
  attributes: {
    jugador: Schema.Attribute.Relation<'oneToOne', 'api::jugador.jugador'>;
    posicion: Schema.Attribute.BigInteger;
    puntos: Schema.Attribute.Decimal & Schema.Attribute.DefaultTo<0>;
  };
}

export interface RankingGlobalEntradaRankingGlobal
  extends Struct.ComponentSchema {
  collectionName: 'components_ranking_global_entrada_ranking_globals';
  info: {
    displayName: 'Entrada Ranking Global';
    icon: 'globe';
  };
  attributes: {
    jugador: Schema.Attribute.Relation<'oneToOne', 'api::jugador.jugador'>;
    posicionGlobal: Schema.Attribute.BigInteger;
    puntosGlobales: Schema.Attribute.Decimal & Schema.Attribute.DefaultTo<0>;
  };
}

declare module '@strapi/strapi' {
  export module Public {
    export interface ComponentSchemas {
      'jugador.estadisticas': JugadorEstadisticas;
      'ranking-categoria.entrada-ranking': RankingCategoriaEntradaRanking;
      'ranking-global.entrada-ranking-global': RankingGlobalEntradaRankingGlobal;
    }
  }
}
