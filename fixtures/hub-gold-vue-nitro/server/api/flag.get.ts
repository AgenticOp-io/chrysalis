export default defineEventHandler((event) => getRequestHeader(event, "x-flag"));
