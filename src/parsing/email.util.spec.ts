import { emailFromHeader } from './email.util';

describe('emailFromHeader', () => {
  it('extracts the address from a display-name header', () => {
    expect(emailFromHeader('Viator <notify@viator.com>')).toBe(
      'notify@viator.com',
    );
  });

  it('accepts a bare address', () => {
    expect(emailFromHeader('notify@viator.com')).toBe('notify@viator.com');
  });

  it('strips a mailto prefix', () => {
    expect(emailFromHeader('mailto:notify@viator.com')).toBe(
      'notify@viator.com',
    );
  });

  it('ignores an invalid value', () => {
    expect(emailFromHeader('Viator')).toBeUndefined();
    expect(emailFromHeader(undefined)).toBeUndefined();
  });
});
