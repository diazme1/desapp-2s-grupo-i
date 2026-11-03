import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { PlayersModule } from '../players/players.module';
import { MlPlayersController } from './ml-players.controller';
import { FastApiPredictionAdapter } from './fastapi-prediction.adapter';
import { MlPredictionService } from './ml-prediction.service';

@Module({
  imports: [AuthModule, PlayersModule],
  controllers: [MlPlayersController],
  providers: [FastApiPredictionAdapter, MlPredictionService],
})
export class MlPlayersModule {}
