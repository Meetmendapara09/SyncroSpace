import { cn, getInitials } from '../utils';

describe('Utils', () => {
  describe('cn', () => {
    test('should merge class names correctly', () => {
      const result = cn('base-class', 'additional-class');
      expect(result).toBe('base-class additional-class');
    });

    test('should handle conditional classes', () => {
      const result = cn('base-class', true && 'conditional-class', false && 'hidden-class');
      expect(result).toBe('base-class conditional-class');
    });

    test('should merge tailwind classes correctly', () => {
      const result = cn('p-4', 'p-2'); // p-2 should override p-4
      expect(result).toBe('p-2');
    });

    test('should handle empty inputs', () => {
      const result = cn();
      expect(result).toBe('');
    });
  });

  describe('getInitials', () => {
    test('should return initials for full name', () => {
      expect(getInitials('John Doe')).toBe('JD');
    });

    test('should return first two characters for single name', () => {
      expect(getInitials('John')).toBe('Jo');
    });

    test('should handle names with multiple spaces', () => {
      expect(getInitials('John Michael Doe')).toBe('JD');
    });

    test('should handle empty string', () => {
      expect(getInitials('')).toBe('');
    });

    test('should handle undefined input', () => {
      expect(getInitials()).toBe('');
    });

    test('should handle names with extra whitespace', () => {
      expect(getInitials('  John   Doe  ')).toBe('JD');
    });

    test('should handle single character names', () => {
      expect(getInitials('J')).toBe('J');
    });

    test('should handle names with special characters', () => {
      expect(getInitials('Jean-Paul Sartre')).toBe('JS');
    });
  });
});