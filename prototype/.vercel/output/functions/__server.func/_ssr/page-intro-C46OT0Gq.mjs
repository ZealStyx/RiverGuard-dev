import { q as require_jsx_runtime } from "../_libs/@tanstack/react-router+[...].mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/page-intro-C46OT0Gq.js
var import_jsx_runtime = require_jsx_runtime();
function PageIntro({ kicker, title, lede }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("header", {
		className: "max-w-2xl",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "text-xs font-medium uppercase tracking-widest text-water",
				children: kicker
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", {
				className: "mt-2 font-display text-4xl tracking-tight text-ink sm:text-5xl",
				children: title
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "mt-3 text-base text-muted",
				children: lede
			})
		]
	});
}
//#endregion
export { PageIntro as t };
