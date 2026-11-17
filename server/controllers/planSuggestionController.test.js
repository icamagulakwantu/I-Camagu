import { describe, expect, it } from 'vitest';
import { parseSuggestion } from './planSuggestionController.js';

describe('parseSuggestion', () => {
  it('needs something to add', () => {
    expect(parseSuggestion({ label: ' ' }).error).toBeTruthy();
  });

  it('cleans and limits the fields', () => {
    const { value } = parseSuggestion({ label: '  Imphepho   for the  ibhoma ', suggestedBy: 'Malume', note: 'x'.repeat(400), phase: 'SPIRITUAL_ITEMS' });
    expect(value).toMatchObject({ label: 'Imphepho for the ibhoma', suggestedBy: 'Malume', phase: 'SPIRITUAL_ITEMS' });
    expect(value.note).toHaveLength(300);
  });

  it('ignores a section name that is not a real one', () => {
    expect(parseSuggestion({ label: 'Blanket', phase: 'drop table' }).value.phase).toBeNull();
    expect(parseSuggestion({ label: 'Blanket' }).value).toMatchObject({ phase: null, note: null, suggestedBy: null });
  });
});
