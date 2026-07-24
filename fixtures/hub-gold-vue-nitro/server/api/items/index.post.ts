export default defineEventHandler(async (event) => {
  setResponseStatus(event, 201);
  const { title } = await readBody(event);
  return { created: true, title: title ?? "" };
});
