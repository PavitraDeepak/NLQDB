import { describe, test, expect } from '@jest/globals';
import llmService from '../src/services/llmService.js';

describe('LLM Service', () => {
  test('buildSystemPrompt - includes schema', () => {
    const schema = {
      customers: {
        fields: { name: { type: 'String' }, city: { type: 'String' } }
      }
    };
    
    const prompt = llmService.buildSystemPrompt(schema, 'viewer');
    
    expect(prompt).toContain('customers');
    expect(prompt).toContain('viewer');
    expect(prompt).toContain('CONSTRAINTS');
  });

  test('parseJsonResponse - handles clean JSON', () => {
    const json = '{"mongoQuery": {"collection": "customers", "find": {}}}';
    const parsed = llmService.parseJsonResponse(json);
    
    expect(parsed.mongoQuery).toBeDefined();
    expect(parsed.mongoQuery.collection).toBe('customers');
  });

  test('parseJsonResponse - handles markdown code blocks', () => {
    const json = '```json\n{"mongoQuery": {"collection": "customers", "find": {}}}\n```';
    const parsed = llmService.parseJsonResponse(json);
    
    expect(parsed.mongoQuery).toBeDefined();
  });

  test('validateResponse - valid response', () => {
    const response = {
      mongoQuery: {
        collection: 'customers',
        find: { city: 'New York' }
      },
      explain: 'Find customers in New York',
      requiresIndexes: ['city'],
      safety: { allowed: true, reason: 'Read-only' }
    };
    
    expect(() => llmService.validateResponse(response)).not.toThrow();
  });

  test('validateResponse - missing fields', () => {
    const response = {
      mongoQuery: { collection: 'customers' }
    };
    
    expect(() => llmService.validateResponse(response)).toThrow();
  });
});
