import { i as __toESM } from "../_runtime.mjs";
import { J as require_react, b as Link, q as require_jsx_runtime } from "../_libs/@tanstack/react-router+[...].mjs";
import { n as GROUPS, o as cn } from "./flood-store-7jh3AzK-.mjs";
import { t as PageIntro } from "./page-intro-C46OT0Gq.mjs";
import { m as useOutlook, r as RiskBadge } from "./use-outlook-DXuFgiND.mjs";
import { n as ChevronRight } from "../_libs/lucide-react.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/towns-Mb_IKl7r.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
function TownsPage() {
	const { ranked, score, level } = useOutlook();
	const [mode, setMode] = (0, import_react.useState)("risk");
	const shown = mode === "risk" ? ranked : ranked.filter((item) => item.town.group === mode);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "grid gap-6",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(PageIntro, {
				kicker: "Where it lands",
				title: "Sixteen towns",
				lede: "The same 72-hour weather hits every town. Low shore and river mouths run hotter than the provincial index. Inland San Pablo is here so the desk does not paint the whole province."
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "flex flex-wrap gap-2",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(FilterButton, {
					active: mode === "risk",
					onClick: () => setMode("risk"),
					children: "By risk"
				}), GROUPS.map((group) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(FilterButton, {
					active: mode === group,
					onClick: () => setMode(group),
					children: group
				}, group))]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
				className: "text-sm text-muted",
				children: [
					"Provincial index ",
					score,
					", ",
					level === "low" ? "low" : level,
					". A town score is that index times its exposure."
				]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "overflow-hidden rounded-2xl bg-card shadow-card",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("ul", {
					className: "divide-y divide-line",
					children: shown.map((item) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("li", { children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Link, {
						to: "/town/$slug",
						params: { slug: item.town.slug },
						className: "flex items-center gap-3 px-4 py-4 transition-colors hover:bg-water-soft sm:px-5",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
								className: "w-12 font-display text-3xl tabular-nums",
								children: item.score
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
								className: "min-w-0 flex-1",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
									className: "flex flex-wrap items-baseline gap-x-2",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
										className: "font-medium",
										children: item.town.name
									}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
										className: "text-xs text-muted",
										children: item.town.group
									})]
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
									className: "mt-1 block text-sm text-muted",
									children: item.town.note
								})]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(RiskBadge, { level: item.level }),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(ChevronRight, {
								className: "size-4 shrink-0 text-muted",
								"aria-hidden": true
							})
						]
					}) }, item.town.slug))
				})
			})
		]
	});
}
function FilterButton({ active, onClick, children }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
		type: "button",
		onClick,
		className: cn("h-11 rounded-full px-4 text-sm font-medium transition-colors", active ? "bg-ink text-card" : "bg-card text-ink shadow-card hover:shadow-card-hover"),
		"aria-pressed": active,
		children
	});
}
//#endregion
export { TownsPage as component };
