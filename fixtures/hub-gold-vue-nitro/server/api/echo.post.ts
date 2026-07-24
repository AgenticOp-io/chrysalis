export default defineEventHandler(async (event) => {
  const { name } = await readBody(event);
  return { echo: true, name: name ?? "" };
});
