import { q as require_jsx_runtime } from "../_libs/@tanstack/react-router+[...].mjs";
import { o as cn } from "./flood-store-7jh3AzK-.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/panel-HIGEir_A.js
var import_jsx_runtime = require_jsx_runtime();
function buttonClass(variant = "solid") {
	return cn("inline-flex h-11 items-center justify-center gap-2 rounded-full px-4 text-sm font-medium transition-colors", variant === "solid" ? "bg-water text-card hover:bg-water-deep" : "bg-card text-ink shadow-card hover:shadow-card-hover");
}
function Panel({ className, children }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("section", {
		className: cn("rounded-2xl bg-card p-5 shadow-card sm:p-6", className),
		children
	});
}
//#endregion
export { buttonClass as n, Panel as t };
