"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.IsSafeUrlConstraint = void 0;
exports.IsSafeUrl = IsSafeUrl;
const class_validator_1 = require("class-validator");
let IsSafeUrlConstraint = class IsSafeUrlConstraint {
    validate(value) {
        if (typeof value !== 'string')
            return false;
        let parsed;
        try {
            parsed = new URL(value);
        }
        catch {
            return false;
        }
        if (!['http:', 'https:'].includes(parsed.protocol))
            return false;
        if (parsed.username || parsed.password)
            return false;
        const host = parsed.hostname.toLowerCase();
        if (host === 'localhost' || host.endsWith('.local') || host.endsWith('.internal')) {
            return false;
        }
        const ipv4 = host.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
        if (ipv4) {
            const parts = ipv4.slice(1).map(Number);
            if (parts.some((p) => p > 255))
                return false;
            const [a, , c] = parts;
            if (a === 0 || a === 10 || a === 127 || a === 169 || a >= 224)
                return false;
            if (a === 172 && c >= 16 && c <= 31)
                return false;
            if (a === 192 && c === 168)
                return false;
        }
        if (host.startsWith('::ffff:7f') || host === '::1' || host === '::')
            return false;
        if (host.includes(':') &&
            (host.startsWith('fc') || host.startsWith('fd') || host.startsWith('fe80'))) {
            return false;
        }
        return true;
    }
    defaultMessage() {
        return 'url must point to a public http(s) address';
    }
};
exports.IsSafeUrlConstraint = IsSafeUrlConstraint;
exports.IsSafeUrlConstraint = IsSafeUrlConstraint = __decorate([
    (0, class_validator_1.ValidatorConstraint)({ name: 'isSafeUrl', async: false })
], IsSafeUrlConstraint);
function IsSafeUrl(validationOptions) {
    return function (object, propertyName) {
        (0, class_validator_1.registerDecorator)({
            target: object.constructor,
            propertyName,
            options: validationOptions,
            constraints: [],
            validator: IsSafeUrlConstraint,
        });
    };
}
//# sourceMappingURL=is-safe-url.validator.js.map