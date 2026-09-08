export function chunkArray<T>(items: T[], size: number): T[][] {
    if (size <= 0) {
        return [items];
    }
    const chunks: T[][] = [];
    for (let i = 0; i < items.length; i += size) {
        chunks.push(items.slice(i, i + size));
    }
    return chunks;
}

export function sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

export function personalizeMailBody(template: string, name: string, email: string): string {
    return template
        .replace(/\{\{name\}\}/gi, name)
        .replace(/\{\{email\}\}/gi, email);
}

export function escapeHtml(text: string): string {
    return text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

export function plainTextToHtmlFragment(text: string): string {
    return escapeHtml(text).replace(/\r\n/g, '\n').replace(/\n/g, '<br>');
}
