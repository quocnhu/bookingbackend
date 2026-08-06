import { ValidationOptions, ValidatorConstraintInterface } from 'class-validator';
export declare class IsSafeUrlConstraint implements ValidatorConstraintInterface {
    validate(value: unknown): boolean;
    defaultMessage(): string;
}
export declare function IsSafeUrl(validationOptions?: ValidationOptions): (object: object, propertyName: string) => void;
