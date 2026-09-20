"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
require("reflect-metadata");
require("dotenv/config");
const common_1 = require("@nestjs/common");
const core_1 = require("@nestjs/core");
const helmet_1 = __importDefault(require("helmet"));
const cookie_parser_1 = __importDefault(require("cookie-parser"));
const app_module_1 = require("@/app.module");
async function bootstrap() {
    const isProduction = process.env.NODE_ENV === 'production';
    if (isProduction &&
        (!process.env.JWT_SECRET ||
            process.env.JWT_SECRET.length < 32 ||
            process.env.JWT_SECRET.includes('change-me'))) {
        throw new Error('JWT_SECRET must be a strong random secret in production');
    }
    const app = await core_1.NestFactory.create(app_module_1.AppModule);
    const corsOrigins = (process.env.CORS_ORIGINS || 'http://localhost:3000')
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);
    app.use((0, helmet_1.default)({
        crossOriginResourcePolicy: { policy: 'cross-origin' },
    }));
    app.use((0, cookie_parser_1.default)());
    app.getHttpAdapter().getInstance().set('trust proxy', 1);
    app.enableCors({
        origin: corsOrigins,
        credentials: true,
    });
    app.setGlobalPrefix('api');
    app.useBodyParser('json', { limit: '15mb' });
    app.useGlobalPipes(new common_1.ValidationPipe({
        whitelist: true,
        transform: true,
        transformOptions: { enableImplicitConversion: true },
    }));
    const port = Number(process.env.PORT || 4000);
    await app.listen(port);
    console.log(`🚀 Backend running on http://localhost:${port}/api`);
}
bootstrap();
//# sourceMappingURL=main.js.map