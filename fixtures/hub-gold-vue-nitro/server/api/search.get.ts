export default defineEventHandler((event) => ({
  q: getQuery(event).q ?? "",
  sid: getCookie(event, "sid") ?? "",
}));
