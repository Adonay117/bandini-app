export function parsePaginacion(searchParams: URLSearchParams, defaultPageSize = 20, maxPageSize = 100) {
  const page = Math.max(1, Number(searchParams.get('page')) || 1);
  const pageSize = Math.min(maxPageSize, Math.max(1, Number(searchParams.get('pageSize')) || defaultPageSize));
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;
  return { page, pageSize, from, to };
}
