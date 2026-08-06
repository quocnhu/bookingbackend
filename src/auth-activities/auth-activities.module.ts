import { Module } from '@nestjs/common';
import { AuthActivitiesController } from './auth-activities.controller';
import { AuthActivitiesService } from './auth-activities.service';

@Module({
  controllers: [AuthActivitiesController],
  providers: [AuthActivitiesService],
  exports: [AuthActivitiesService],
})
export class AuthActivitiesModule {}
