// Trimmed SvelteKit server manifest fixture for the UI asset lift (D6365).
// Shape mirrors .svelte-kit/output/server/manifest-full.js route entries.
export const manifest = {
	appDir: "_app",
	routes: [
		{
			id: "/",
			pattern: /^\/$/,
			params: [],
			page: { layouts: [0,], errors: [1,], leaf: 2 },
			endpoint: null
		},
		{
			id: "/login",
			pattern: /^\/login\/?$/,
			params: [],
			page: { layouts: [0,], errors: [1,], leaf: 3 },
			endpoint: null
		},
		{
			id: "/portal/[tenantId]",
			pattern: /^\/portal\/([^/]+?)\/?$/,
			params: [{ name: "tenantId", optional: false, rest: false, chained: false }],
			page: { layouts: [0,], errors: [1,], leaf: 4 },
			endpoint: null
		},
		{
			id: "/api/health",
			pattern: /^\/api\/health\/?$/,
			params: [],
			endpoint: null
		}
	]
};
