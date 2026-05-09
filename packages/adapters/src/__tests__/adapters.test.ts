import { describe, it, expect } from 'vitest';
import { AdapterError } from '../types';

describe('AdapterError', () => {
  it('creates error with correct properties', () => {
    const err = new AdapterError('test message', 'NOT_FOUND', false, 404);
    expect(err.message).toBe('test message');
    expect(err.code).toBe('NOT_FOUND');
    expect(err.retryable).toBe(false);
    expect(err.statusCode).toBe(404);
    expect(err.name).toBe('AdapterError');
  });
});
