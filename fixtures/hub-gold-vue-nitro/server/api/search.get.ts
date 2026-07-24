export default defineEventHandler((event) => ({ q: getQuery(event).q ?? "" }));
