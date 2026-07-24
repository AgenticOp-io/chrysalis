export default defineEventHandler((event) => ({ patched: true, id: getRouterParam(event, "id") }));
