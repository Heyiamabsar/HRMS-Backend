import { withoutDeletedUsers } from '../../../utils/commonUtils.js';
import { describe, test, expect } from '@jest/globals';

describe('Utils - Common Utils', () => {
  describe('withoutDeletedUsers', () => {
    test('should add isDeleted filter when no filter provided', () => {
      const result = withoutDeletedUsers();
      expect(result).toEqual({ isDeleted: false });
    });

    test('should merge isDeleted filter with existing filter', () => {
      const result = withoutDeletedUsers({ email: 'test@example.com' });
      expect(result).toEqual({ 
        email: 'test@example.com',
        isDeleted: false 
      });
    });

    test('should not override existing isDeleted filter', () => {
      const result = withoutDeletedUsers({ isDeleted: true });
      expect(result).toEqual({ isDeleted: false });
    });

    test('should handle multiple filter properties', () => {
      const result = withoutDeletedUsers({ 
        email: 'test@example.com',
        role: 'admin'
      });
      expect(result).toEqual({ 
        email: 'test@example.com',
        role: 'admin',
        isDeleted: false 
      });
    });
  });
});
