export default defineEventHandler((event) => ({ updated: true, id: getRouterParam(event, "id") }));
