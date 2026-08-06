import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { PermissionsService } from './permissions.service';
import { AuthActivitiesModule } from '@/auth-activities/auth-activities.module';
import { DriveModule } from '@/drive/drive.module';

@Module({
  imports: [
    AuthActivitiesModule,
    DriveModule,
    JwtModule.register({
      secret: process.env.JWT_SECRET,
      signOptions: { expiresIn: (process.env.JWT_EXPIRES_IN || '1d') as any },
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, PermissionsService],
  exports: [PermissionsService, JwtModule],
})
export class AuthModule {}
