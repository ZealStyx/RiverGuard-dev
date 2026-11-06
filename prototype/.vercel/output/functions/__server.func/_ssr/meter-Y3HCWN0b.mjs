import { q as require_jsx_runtime } from "../_libs/@tanstack/react-router+[...].mjs";
import { o as cn } from "./flood-store-7jh3AzK-.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/meter-Y3HCWN0b.js
var import_jsx_runtime = require_jsx_runtime();
var FILL = {
	low: "bg-water",
	watch: "bg-ink",
	warning: "bg-clay",
	critical: "bg-clay"
};
function IndexMeter({ score, level, thresholds }) {
	const pct = Math.max(0, Math.min(100, score));
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
		className: "h-2 overflow-hidden rounded-full bg-line",
		role: "img",
		"aria-label": `Flood index ${Math.round(score)} out of 100`,
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
			className: cn("h-full rounded-full", FILL[level]),
			style: { width: `${pct}%` }
		})
	}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
				className: "tabular-nums",
				children: ["Watch ", thresholds.watch]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
				className: "tabular-nums",
				children: ["Warning ", thresholds.warning]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
				className: "tabular-nums",
				children: ["Critical ", thresholds.critical]
			})
		]
	})] });
}
//#endregion
export { IndexMeter as t };
