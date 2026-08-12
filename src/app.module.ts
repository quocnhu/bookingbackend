import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';
import { ServeStaticModule } from '@nestjs/serve-static';
import { join } from 'path';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { PrismaModule } from './prisma/prisma.module';
import { CacheModule } from './cache/cache.module';
import { AuditModule } from './audit/audit.module';
import { AuthActivitiesModule } from './auth-activities/auth-activities.module';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard';
import { RoleGuard } from './common/guards/role.guard';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { RolesModule } from './roles/roles.module';
import { PermissionsModule } from './permissions/permissions.module';
import { ToursModule } from './tours/tours.module';
import { BookingModule } from './booking/booking.module';
import { AssignmentsModule } from './assignments/assignments.module';
import { SettlementsModule } from './settlements/settlements.module';
import { AuditLogsModule } from './audit-logs/audit-logs.module';
import { DashboardModule } from './dashboard/dashboard.module';
import { IngestionModule } from './ingestion/ingestion.module';
import { RawDataModule } from './raw-data/raw-data.module';
import { ParsingModule } from './parsing/parsing.module';
import { QueuesModule } from './queues/queues.module';
import { DriveModule } from './drive/drive.module';
import { StorageModule } from './storage';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ThrottlerModule.forRoot([{ ttl: 60000, limit: 100 }]),
    PrismaModule,
    StorageModule,
    CacheModule,
    AuditModule,
    AuthActivitiesModule,
    AuthModule,
    UsersModule,
    RolesModule,
    PermissionsModule,
    ToursModule,
    BookingModule,
    AssignmentsModule,
    SettlementsModule,
    AuditLogsModule,
    DashboardModule,
    IngestionModule,
    RawDataModule,
    ParsingModule,
    QueuesModule,
    DriveModule,
    ServeStaticModule.forRoot({
      rootPath: join(process.cwd(), 'uploads'),
      serveRoot: '/uploads',
    }),
  ],
  providers: [
    { provide: APP_GUARD, useClass: JwtAuthGuard }, // chạy trước: xác thực + gắn req.user
    { provide: APP_GUARD, useClass: RoleGuard }, // chạy sau: kiểm tra role/permission
    { provide: APP_GUARD, useClass: ThrottlerGuard }, // rate-limit toàn cục
  ],
})
export class AppModule {}
