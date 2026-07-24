export default defineEventHandler(async (event) => {
  setResponseStatus(event, 201);
  const body = await readBody(event);
  return { created: true, title: body.title ?? "" };
});
