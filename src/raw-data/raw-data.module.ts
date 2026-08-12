import { Module } from '@nestjs/common';
import { RawDataController } from './raw-data.controller';
import { RawDataRepository } from './raw-data.repository';
import { RawDataService } from './raw-data.service';

@Module({
  controllers: [RawDataController],
  providers: [RawDataRepository, RawDataService],
  exports: [RawDataRepository, RawDataService],
})
export class RawDataModule {}
