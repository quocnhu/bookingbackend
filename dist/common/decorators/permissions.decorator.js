"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AnyPermissions = exports.ANY_PERMISSIONS_KEY = exports.Permissions = exports.PERMISSIONS_KEY = void 0;
const common_1 = require("@nestjs/common");
exports.PERMISSIONS_KEY = 'permissions';
const Permissions = (...permissions) => (0, common_1.SetMetadata)(exports.PERMISSIONS_KEY, permissions);
exports.Permissions = Permissions;
exports.ANY_PERMISSIONS_KEY = 'anyPermissions';
const AnyPermissions = (...permissions) => (0, common_1.SetMetadata)(exports.ANY_PERMISSIONS_KEY, permissions);
exports.AnyPermissions = AnyPermissions;
//# sourceMappingURL=permissions.decorator.js.map