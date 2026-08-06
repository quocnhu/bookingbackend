import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';
import { ServeStaticModule } from '@nestjs/serve-static';
import { join } from 'path';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { PrismaModule } from './prisma/prisma.module';
import { AuditModule } from './audit/audit.module';
import { AuthActivitiesModule } from './auth-activities/auth-activities.module';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard';
import { RoleGuard } from './common/guards/role.guard';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { RolesModule } from './roles/roles.module';
import { PermissionsModule } from './permissions/permissions.module';
import { ToursModule } from './tours/tours.module';
import { BookingsModule } from './bookings/bookings.module';
import { AssignmentsModule } from './assignments/assignments.module';
import { SettlementsModule } from './settlements/settlements.module';
import { AuditLogsModule } from './audit-logs/audit-logs.module';
import { DashboardModule } from './dashboard/dashboard.module';
import { GmailModule } from './gmail/gmail.module';
import { QueuesModule } from './queues/queues.module';
import { DriveModule } from './drive/drive.module';
import { StorageModule } from './storage';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ThrottlerModule.forRoot([{ ttl: 60000, limit: 100 }]),
    PrismaModule,
    StorageModule,
    AuditModule,
    AuthActivitiesModule,
    AuthModule,
    UsersModule,
    RolesModule,
    PermissionsModule,
    ToursModule,
    BookingsModule,
    AssignmentsModule,
    SettlementsModule,
    AuditLogsModule,
    DashboardModule,
    GmailModule,
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
