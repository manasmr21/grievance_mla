export function generateCode(name: string): string {
  if (!name) return '';
  return name
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9\s]/g, '') // Remove special characters
    .replace(/\s+/g, '_');      // Replace spaces with underscores
}