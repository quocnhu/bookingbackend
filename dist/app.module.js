"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppModule = void 0;
const common_1 = require("@nestjs/common");
const core_1 = require("@nestjs/core");
const config_1 = require("@nestjs/config");
const serve_static_1 = require("@nestjs/serve-static");
const path_1 = require("path");
const throttler_1 = require("@nestjs/throttler");
const schedule_1 = require("@nestjs/schedule");
const prisma_module_1 = require("./prisma/prisma.module");
const cache_module_1 = require("./cache/cache.module");
const audit_module_1 = require("./audit/audit.module");
const auth_activities_module_1 = require("./auth-activities/auth-activities.module");
const jwt_auth_guard_1 = require("./common/guards/jwt-auth.guard");
const role_guard_1 = require("./common/guards/role.guard");
const auth_module_1 = require("./auth/auth.module");
const users_module_1 = require("./users/users.module");
const roles_module_1 = require("./roles/roles.module");
const permissions_module_1 = require("./permissions/permissions.module");
const tours_module_1 = require("./tours/tours.module");
const booking_module_1 = require("./booking/booking.module");
const assignments_module_1 = require("./assignments/assignments.module");
const settlements_module_1 = require("./settlements/settlements.module");
const company_profile_module_1 = require("./company-profile/company-profile.module");
const audit_logs_module_1 = require("./audit-logs/audit-logs.module");
const dashboard_module_1 = require("./dashboard/dashboard.module");
const ingestion_module_1 = require("./ingestion/ingestion.module");
const raw_data_module_1 = require("./raw-data/raw-data.module");
const parsing_module_1 = require("./parsing/parsing.module");
const queues_module_1 = require("./queues/queues.module");
const drive_module_1 = require("./drive/drive.module");
const storage_1 = require("./storage");
const notifications_module_1 = require("./notifications/notifications.module");
const leaves_module_1 = require("./leaves/leaves.module");
const coordinates_module_1 = require("./coordinates/coordinates.module");
const route_prices_module_1 = require("./route-prices/route-prices.module");
const transportation_providers_module_1 = require("./transportation-providers/transportation-providers.module");
let AppModule = class AppModule {
};
exports.AppModule = AppModule;
exports.AppModule = AppModule = __decorate([
    (0, common_1.Module)({
        imports: [
            config_1.ConfigModule.forRoot({ isGlobal: true }),
            throttler_1.ThrottlerModule.forRoot([{ ttl: 60000, limit: 100 }]),
            schedule_1.ScheduleModule.forRoot(),
            prisma_module_1.PrismaModule,
            storage_1.StorageModule,
            cache_module_1.CacheModule,
            audit_module_1.AuditModule,
            auth_activities_module_1.AuthActivitiesModule,
            auth_module_1.AuthModule,
            users_module_1.UsersModule,
            roles_module_1.RolesModule,
            permissions_module_1.PermissionsModule,
            tours_module_1.ToursModule,
            booking_module_1.BookingModule,
            assignments_module_1.AssignmentsModule,
            settlements_module_1.SettlementsModule,
            company_profile_module_1.CompanyProfileModule,
            audit_logs_module_1.AuditLogsModule,
            dashboard_module_1.DashboardModule,
            ingestion_module_1.IngestionModule,
            raw_data_module_1.RawDataModule,
            parsing_module_1.ParsingModule,
            queues_module_1.QueuesModule,
            drive_module_1.DriveModule,
            notifications_module_1.NotificationsModule,
            leaves_module_1.LeavesModule,
            coordinates_module_1.CoordinatesModule,
            route_prices_module_1.RoutePricesModule,
            transportation_providers_module_1.TransportationProvidersModule,
            serve_static_1.ServeStaticModule.forRoot({
                rootPath: (0, path_1.join)(process.cwd(), 'uploads'),
                serveRoot: '/uploads',
            }),
        ],
        providers: [
            { provide: core_1.APP_GUARD, useClass: jwt_auth_guard_1.JwtAuthGuard },
            { provide: core_1.APP_GUARD, useClass: role_guard_1.RoleGuard },
            { provide: core_1.APP_GUARD, useClass: throttler_1.ThrottlerGuard },
        ],
    })
], AppModule);
//# sourceMappingURL=app.module.js.map