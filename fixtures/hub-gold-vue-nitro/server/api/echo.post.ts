export default defineEventHandler(async (event) => ({
  echo: true,
  name: (await readBody(event)).name ?? "",
}));
