export default defineEventHandler((event) => {
  setResponseStatus(event, 202);
  return { ok: true };
});
