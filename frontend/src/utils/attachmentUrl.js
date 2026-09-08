const baseUrl = (import.meta.env.VITE_BASE_URL || 'http://localhost:8080').replace(/\/$/, '');

/** Resolve a stored attachment URL to an absolute backend URL. */
export function resolveAttachmentUrl(url) {
  if (!url) return '';
  if (/^https?:\/\//i.test(url)) return url;
  if (url.startsWith('/')) return `${baseUrl}${url}`;
  return `${baseUrl}/${url}`;
}

/** True when the attachment path looks like a raster image. */
export function isImageAttachment(url) {
  if (!url) return false;
  return /\.(jpe?g|png|gif|webp)(\?.*)?$/i.test(url);
}
