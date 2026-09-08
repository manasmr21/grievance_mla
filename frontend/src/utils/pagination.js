/**
 * Returns page numbers and ellipsis markers for table pagination.
 * When totalPages <= 5, all pages are shown.
 * Otherwise: first four, current ±1, middle, and last two — with ellipsis between gaps.
 */
export function getPaginationItems(currentPage, totalPages) {
  if (totalPages <= 0) return [];

  if (totalPages <= 5) {
    return Array.from({ length: totalPages }, (_, i) => i + 1);
  }

  const middlePage = Math.ceil(totalPages / 2);
  const pages = new Set([1, 2, 3, 4, middlePage, totalPages - 1, totalPages]);

  pages.add(currentPage);
  if (currentPage > 1) pages.add(currentPage - 1);
  if (currentPage < totalPages) pages.add(currentPage + 1);

  const sorted = [...pages]
    .filter((p) => p >= 1 && p <= totalPages)
    .sort((a, b) => a - b);

  const result = [];
  for (let i = 0; i < sorted.length; i++) {
    if (i > 0 && sorted[i] - sorted[i - 1] > 1) {
      result.push('...');
    }
    result.push(sorted[i]);
  }

  return result;
}

/**
 * Clamps a page number to valid range.
 */
export function clampPage(page, totalPages) {
  if (totalPages <= 0) return 1;
  return Math.min(Math.max(1, page), totalPages);
}
