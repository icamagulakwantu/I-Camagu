const PREVIEWS = [
  {
    pattern: /^\/share\/[^/]+\/?$/,
    title: 'A family ceremony plan on i-Camagu',
    description: 'Open i-Camagu to view and take part in a shared family ceremony plan.',
  },
  {
    pattern: /^\/pool\/[^/]+\/?$/,
    title: 'A group order on i-Camagu',
    description: 'Join a SmartMatch group order and buy together with your community.',
  },
  {
    pattern: /^\/join\/stokvel\/[^/]+\/?$/,
    title: 'Join a stokvel on i-Camagu',
    description: 'Your group has invited you to organise savings together on i-Camagu.',
  },
  {
    pattern: /^\/join\/clan\/[^/]+\/?$/,
    title: 'Join your clan group on i-Camagu',
    description: 'Your family has invited you to connect and plan together on i-Camagu.',
  },
];

export function getSharePreview(pathname) {
  return PREVIEWS.find((item) => item.pattern.test(String(pathname || ''))) || null;
}

export function isPreviewCrawler(userAgent = '') {
  return /whatsapp|facebookexternalhit|twitterbot|linkedinbot|slackbot|discordbot|telegrambot|pinterest|googlebot|bingbot/i.test(String(userAgent));
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (char) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  })[char]);
}

export function renderSharePreview(html, preview, shareUrl) {
  const title = escapeHtml(preview.title);
  const description = escapeHtml(preview.description);
  const url = escapeHtml(shareUrl);
  return String(html)
    .replace(/<title>[\s\S]*?<\/title>/i, '<title>' + title + '</title>')
    .replace(/<meta name="description" content="[^"]*" \/>/i, '<meta name="description" content="' + description + '" />')
    .replace(/<meta property="og:title" content="[^"]*" \/>/i, '<meta property="og:title" content="' + title + '" />')
    .replace(/<meta property="og:description" content="[^"]*" \/>/i, '<meta property="og:description" content="' + description + '" />')
    .replace(/<meta property="og:url" content="[^"]*" \/>/i, '<meta property="og:url" content="' + url + '" />');
}
