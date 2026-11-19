const { z } = require('zod');
const { AppError } = require('./AppError');

// Same query parameters and response shape for every list in every project.
const pageQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  size: z.coerce.number().int().min(1).max(100).default(20),
  sort: z.string().max(50).optional(),
});

function skipFor(query) {
  return (query.page - 1) * query.size;
}

/** Builds { items, page, size, totalItems, totalPages }. */
function toPage(items, totalItems, query) {
  return {
    items,
    page: query.page,
    size: query.size,
    totalItems,
    totalPages: Math.ceil(totalItems / query.size),
  };
}

/**
 * Turns "createdAt" or "-createdAt" (descending) into a MongoDB sort.
 * Only fields in the allow-list are accepted. _id is added as a tie-breaker
 * so items with the same value never move between pages.
 */
function parseSort(sort, allowedFields, defaultSort) {
  const value = sort ?? defaultSort;
  const descending = value.startsWith('-');
  const field = descending ? value.slice(1) : value;

  if (!allowedFields.includes(field)) {
    throw new AppError(400, 'VALIDATION_FAILED', 'Some fields are not valid.', [
      { field: 'sort', message: `Sort by one of: ${allowedFields.join(', ')}` },
    ]);
  }

  const direction = descending ? -1 : 1;
  return { [field]: direction, _id: direction };
}

module.exports = { pageQuerySchema, skipFor, toPage, parseSort };
