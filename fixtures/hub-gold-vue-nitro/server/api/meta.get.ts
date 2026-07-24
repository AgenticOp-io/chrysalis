export default defineEventHandler((event) => ({
  service: "hub-gold-vue-nitro",
  version: 1,
  agent: getHeader(event, "user-agent") ?? "",
}));
