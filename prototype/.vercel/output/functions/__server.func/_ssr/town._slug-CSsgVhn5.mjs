import { b as Link, q as require_jsx_runtime } from "../_libs/@tanstack/react-router+[...].mjs";
import { s as townBySlug } from "./flood-store-7jh3AzK-.mjs";
import { n as buttonClass, t as Panel } from "./panel-HIGEir_A.mjs";
import { h as verdictTitle, l as levelLabel, m as useOutlook, r as RiskBadge } from "./use-outlook-DXuFgiND.mjs";
import { t as IndexMeter } from "./meter-Y3HCWN0b.mjs";
import { n as Route } from "./router-6zDmi-pE.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/town._slug-CSsgVhn5.js
var import_jsx_runtime = require_jsx_runtime();
function TownPage() {
	const { slug } = Route.useParams();
	const town = townBySlug(slug);
	const { score, ranked, thresholds, level } = useOutlook();
	if (!town) return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "max-w-xl",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", {
				className: "font-display text-4xl tracking-tight",
				children: "This town is not on the desk"
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "mt-3 text-muted",
				children: "The sample desk covers sixteen Laguna towns."
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Link, {
				to: "/towns",
				className: `${buttonClass()} mt-6`,
				children: "All towns"
			})
		]
	});
	const row = ranked.find((item) => item.town.slug === town.slug);
	const townScore = row?.score ?? 0;
	const townLevel = row?.level ?? "low";
	const hotter = town.susceptibility >= 1;
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "grid gap-6 lg:grid-cols-5",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "lg:col-span-3",
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "text-xs font-medium uppercase tracking-widest text-water",
					children: town.group
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", {
					className: "mt-2 font-display text-4xl tracking-tight sm:text-5xl",
					children: town.name
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "mt-3 text-muted",
					children: town.water
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "mt-6 flex flex-wrap items-end gap-4",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "font-display text-6xl tabular-nums leading-none",
						children: townScore
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "pb-1",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(RiskBadge, { level: townLevel }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "mt-1 text-sm text-muted",
							children: verdictTitle(townLevel)
						})]
					})]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "mt-6 max-w-xl",
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(IndexMeter, {
						score: townScore,
						level: townLevel,
						thresholds
					})
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "mt-6 max-w-xl text-base",
					children: town.detail
				})
			]
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Panel, {
			className: "lg:col-span-2",
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
					className: "font-display text-2xl tracking-tight",
					children: "How this score is made"
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "mt-3 text-sm text-muted",
					children: "Provincial index times exposure. The weather does not change from town to town on this desk."
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
					className: "mt-5 font-display text-3xl tabular-nums",
					children: [
						score,
						" × ",
						town.susceptibility.toFixed(2)
					]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
					className: "mt-2 text-sm text-muted",
					children: [
						hotter ? "This town runs hotter than the province." : "This town runs cooler than the province.",
						" ",
						"The province itself is ",
						levelLabel(level).toLowerCase(),
						"."
					]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("dl", {
					className: "mt-5 divide-y divide-line text-sm",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "flex justify-between gap-4 py-3",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("dt", {
								className: "text-muted",
								children: "Exposure"
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("dd", {
								className: "tabular-nums",
								children: [town.susceptibility.toFixed(2), "×"]
							})]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "flex justify-between gap-4 py-3",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("dt", {
								className: "text-muted",
								children: "Water"
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("dd", {
								className: "text-right",
								children: town.water
							})]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "flex justify-between gap-4 py-3",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("dt", {
								className: "text-muted",
								children: "Shore group"
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("dd", { children: town.group })]
						})
					]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Link, {
					to: "/towns",
					className: `${buttonClass("ghost")} mt-6 w-full`,
					children: "All towns"
				})
			]
		})]
	});
}
//#endregion
export { TownPage as component };
