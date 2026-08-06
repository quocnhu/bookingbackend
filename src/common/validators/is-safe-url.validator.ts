import {
  registerDecorator,
  ValidationOptions,
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from 'class-validator';

@ValidatorConstraint({ name: 'isSafeUrl', async: false })
export class IsSafeUrlConstraint implements ValidatorConstraintInterface {
  validate(value: unknown): boolean {
    if (typeof value !== 'string') return false;
    let parsed: URL;
    try {
      parsed = new URL(value);
    } catch {
      return false;
    }
    if (!['http:', 'https:'].includes(parsed.protocol)) return false;
    if (parsed.username || parsed.password) return false;

    const host = parsed.hostname.toLowerCase();
    if (host === 'localhost' || host.endsWith('.local') || host.endsWith('.internal')) {
      return false;
    }

    const ipv4 = host.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
    if (ipv4) {
      const parts = ipv4.slice(1).map(Number);
      if (parts.some((p) => p > 255)) return false;
      const [a, , c] = parts;
      if (a === 0 || a === 10 || a === 127 || a === 169 || a >= 224) return false;
      if (a === 172 && c >= 16 && c <= 31) return false;
      if (a === 192 && c === 168) return false;
    }

    if (host.startsWith('::ffff:7f') || host === '::1' || host === '::') return false;
    if (
      host.includes(':') &&
      (host.startsWith('fc') || host.startsWith('fd') || host.startsWith('fe80'))
    ) {
      return false;
    }
    return true;
  }

  defaultMessage(): string {
    return 'url must point to a public http(s) address';
  }
}

export function IsSafeUrl(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      target: object.constructor,
      propertyName,
      options: validationOptions,
      constraints: [],
      validator: IsSafeUrlConstraint,
    });
  };
}
