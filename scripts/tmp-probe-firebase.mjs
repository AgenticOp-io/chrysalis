for (const base of [
  "https://wisptools-management.web.app",
  "https://management.wisptools.io",
]) {
  try {
    const res = await fetch(base + "/modules/inventory", { redirect: "follow" });
    const s = await res.text();
    const v = /wisp-cwl-client\.js\?v=(\w+)/.exec(s);
    console.log(base, {
      status: res.status,
      bytes: s.length,
      gotoResidue: (s.match(/goto\(/g) || []).length,
      rawEvents: (s.match(/\son:[a-z]+\s*=\s*\{/g) || []).length,
      clientVersion: v && v[1],
    });
  } catch (e) {
    console.log(base, "ERROR", e.message);
  }
}
