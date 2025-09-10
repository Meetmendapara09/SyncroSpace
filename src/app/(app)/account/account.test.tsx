
import { getInitials } from '@/lib/utils';

describe('getInitials', () => {
    it('should return the first letter of the first and last name', () => {
        expect(getInitials('John Doe')).toBe('JD');
    });

    it('should return the first two letters if only one name is provided', () => {
        expect(getInitials('John')).toBe('Jo');
    });

    it('should handle multiple spaces between names', () => {
        expect(getInitials('John  Doe')).toBe('JD');
    });

    it('should return an empty string if no name is provided', () => {
        expect(getInitials()).toBe('');
        expect(getInitials('')).toBe('');
    });

    it('should handle names with more than two parts', () => {
        expect(getInitials('John Fitzgerald Kennedy')).toBe('JK');
    });

    it('should handle names with leading/trailing spaces', () => {
        expect(getInitials('  John Doe  ')).toBe('JD');
    });

    it('should handle single letter names', () => {
        expect(getInitials('J D')).toBe('JD');
    });
});
