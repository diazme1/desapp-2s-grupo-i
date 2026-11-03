import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { DATABASE_DATA_SOURCE, DatabaseModule } from '../database/database.module';
import { QuoteHistoryController } from './quote-history.controller';
import { QUOTE_HISTORY_REPOSITORY } from './quotes.repository';
import { QUOTE_RECALCULATION_REPOSITORY } from './quote-recalculation.repository';
import { QUOTE_RANKING_REPOSITORY } from './quote-ranking.repository';
import { QUOTE_OPENING_WRITER } from './quote-opening-writer';
import { HistorialCotizacionService } from './historial-cotizacion.service';
import { QuotesController } from './quotes.controller';
import { RankingController } from './ranking.controller';
import { RankingCotizacionesService } from './ranking-cotizaciones.service';
import { RecalcularCotizacionesService } from './recalcular-cotizaciones.service';
import { TypeOrmQuotesRepository } from './persistence/typeorm-quotes.repository';
import { TypeOrmQuoteOpeningWriter } from './persistence/typeorm-quote-opening-writer';

@Module({
  imports: [AuthModule, DatabaseModule],
  controllers: [QuoteHistoryController, QuotesController, RankingController],
  providers: [
    {
      provide: TypeOrmQuotesRepository,
      inject: [DATABASE_DATA_SOURCE],
      useFactory: (dataSource: import('typeorm').DataSource) =>
        new TypeOrmQuotesRepository(dataSource),
    },
    {
      provide: QUOTE_HISTORY_REPOSITORY,
      useExisting: TypeOrmQuotesRepository,
    },
    {
      provide: QUOTE_RECALCULATION_REPOSITORY,
      useExisting: TypeOrmQuotesRepository,
    },
    {
      provide: QUOTE_RANKING_REPOSITORY,
      useExisting: TypeOrmQuotesRepository,
    },
    {
      provide: QUOTE_OPENING_WRITER,
      useClass: TypeOrmQuoteOpeningWriter,
    },
    HistorialCotizacionService,
    RecalcularCotizacionesService,
    RankingCotizacionesService,
  ],
  exports: [QUOTE_OPENING_WRITER],
})
export class QuotesModule {}
