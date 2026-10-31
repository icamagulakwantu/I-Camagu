import { describe, expect, it } from 'vitest';
import { getSharePreview, isPreviewCrawler, renderSharePreview } from './sharePreview.js';

describe('privacy-safe share previews', () => {
  it('uses generic copy for private ceremony links without exposing the token', () => {
    const preview = getSharePreview('/share/private-token-123');
    expect(preview.title).toBe('A family ceremony plan on iCamagu');
    expect(preview.description).not.toContain('private-token-123');
  });

  it('does not distinguish valid and unknown share tokens', () => {
    expect(getSharePreview('/share/valid-looking-token')).toEqual(getSharePreview('/share/unknown-token'));
  });

  it('uses generic descriptions for stokvel, clan and pool invitations', () => {
    expect(getSharePreview('/join/stokvel/abc').title).toBe('Join a stokvel on iCamagu');
    expect(getSharePreview('/join/clan/abc').title).toBe('Join your clan group on iCamagu');
    expect(getSharePreview('/pool/abc').title).toBe('A group order on iCamagu');
  });

  it('only serves crawler-specific previews to known social crawlers', () => {
    expect(isPreviewCrawler('WhatsApp/2.0')).toBe(true);
    expect(isPreviewCrawler('Mozilla/5.0 Chrome/120')).toBe(false);
  });

  it('replaces title and metadata without inserting private source data', () => {
    const html = '<title>iCamagu</title><meta name="description" content="default" /><meta property="og:title" content="default" /><meta property="og:description" content="default" /><meta property="og:url" content="https://example.test/" />';
    const rendered = renderSharePreview(html, getSharePreview('/share/secret'), 'https://example.test/share/secret');
    expect(rendered).toContain('A family ceremony plan on iCamagu');
    expect(rendered).not.toContain('private name');
  });
});
