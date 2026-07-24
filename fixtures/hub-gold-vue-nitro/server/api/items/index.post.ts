export default defineEventHandler(async (event) => {
  setResponseStatus(event, 201);
  return { created: true, title: (await readBody(event)).title ?? "" };
});
