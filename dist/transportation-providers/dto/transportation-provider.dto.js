"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AssignDriverToProviderDto = exports.UpdateTransportationVehicleDto = exports.CreateTransportationVehicleDto = exports.CreateTransportationProviderDto = void 0;
const class_validator_1 = require("class-validator");
const class_transformer_1 = require("class-transformer");
class CreateTransportationProviderDto {
    name;
    email;
    password;
}
exports.CreateTransportationProviderDto = CreateTransportationProviderDto;
__decorate([
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateTransportationProviderDto.prototype, "name", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateTransportationProviderDto.prototype, "email", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateTransportationProviderDto.prototype, "password", void 0);
class CreateTransportationVehicleDto {
    providerId;
    plateNumber;
    capacity;
    brand;
}
exports.CreateTransportationVehicleDto = CreateTransportationVehicleDto;
__decorate([
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateTransportationVehicleDto.prototype, "providerId", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateTransportationVehicleDto.prototype, "plateNumber", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsInt)(),
    (0, class_transformer_1.Type)(() => Number),
    __metadata("design:type", Number)
], CreateTransportationVehicleDto.prototype, "capacity", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateTransportationVehicleDto.prototype, "brand", void 0);
class UpdateTransportationVehicleDto {
    providerId;
    plateNumber;
    capacity;
    brand;
}
exports.UpdateTransportationVehicleDto = UpdateTransportationVehicleDto;
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], UpdateTransportationVehicleDto.prototype, "providerId", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], UpdateTransportationVehicleDto.prototype, "plateNumber", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsInt)(),
    (0, class_transformer_1.Type)(() => Number),
    __metadata("design:type", Number)
], UpdateTransportationVehicleDto.prototype, "capacity", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], UpdateTransportationVehicleDto.prototype, "brand", void 0);
class AssignDriverToProviderDto {
    userId;
}
exports.AssignDriverToProviderDto = AssignDriverToProviderDto;
__decorate([
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], AssignDriverToProviderDto.prototype, "userId", void 0);
//# sourceMappingURL=transportation-provider.dto.js.map