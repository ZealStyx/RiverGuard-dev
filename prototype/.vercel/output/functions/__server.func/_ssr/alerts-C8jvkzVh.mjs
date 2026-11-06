import { b as Link, q as require_jsx_runtime } from "../_libs/@tanstack/react-router+[...].mjs";
import { a as TOWNS } from "./flood-store-7jh3AzK-.mjs";
import { n as buttonClass, t as Panel } from "./panel-HIGEir_A.mjs";
import { t as PageIntro } from "./page-intro-C46OT0Gq.mjs";
import { d as roundIndex, f as smsText, h as verdictTitle, m as useOutlook, p as townIndex, r as RiskBadge, s as dayParts, u as levelOf } from "./use-outlook-DXuFgiND.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/alerts-C8jvkzVh.js
var import_jsx_runtime = require_jsx_runtime();
var WHEN = [
	"Today",
	"Tomorrow",
	"The day after"
];
function AlertsPage() {
	const { days, score, level, thresholds, ranked, config } = useOutlook();
	const names = ranked.slice(0, 3).map((item) => item.town.name);
	const sms = smsText(level, score, names);
	const triggered = days.slice(0, 3).map((day, index) => {
		const dayScore = roundIndex(dayParts(day, config).score);
		return {
			day,
			dayScore,
			dayLevel: levelOf(dayScore, thresholds),
			towns: TOWNS.map((town) => ({
				name: town.name,
				score: roundIndex(townIndex(dayScore, town.susceptibility))
			})).filter((town) => town.score >= thresholds.watch).sort((a, b) => b.score - a.score).slice(0, 4),
			index
		};
	}).filter((window) => window.dayLevel !== "low");
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "grid gap-6",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(PageIntro, {
				kicker: "If this call were live",
				title: "Alerts",
				lede: "A bulletin the desk would send from the current forecast. Nothing here is dispatched, and it is not a PAGASA warning."
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Panel, { children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "flex flex-wrap items-start justify-between gap-3",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "text-xs font-medium uppercase tracking-widest text-muted",
						children: "SMS draft"
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
						className: "mt-2 font-display text-3xl tracking-tight",
						children: verdictTitle(level)
					})] }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(RiskBadge, { level })]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "mt-5 rounded-xl bg-paper px-4 py-4 text-base",
					children: sms
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
					className: `mt-2 text-sm tabular-nums ${sms.length > 160 ? "text-clay" : "text-muted"}`,
					children: [sms.length, " / 160 characters"]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("ul", {
					className: "mt-5 flex flex-wrap gap-2",
					"aria-label": "Channels, not connected",
					children: [
						"Barangay desk",
						"SMS",
						"Shore siren"
					].map((channel) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", {
						className: "inline-flex h-11 items-center rounded-full bg-paper px-4 text-sm text-muted",
						children: [channel, /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
							className: "ml-2 text-xs",
							children: "Not connected"
						})]
					}, channel))
				})
			] }),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
				className: "font-display text-2xl tracking-tight",
				children: "Windows inside 72 hours"
			}), triggered.length === 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Panel, {
				className: "mt-4",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "font-medium",
					children: "No window is over Watch."
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "mt-2 max-w-xl text-sm text-muted",
					children: "The draft above still exists, and it says the desk would stay quiet. Raise the rain or the lake on the forecast page to see a window open."
				})]
			}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("ul", {
				className: "mt-4 grid gap-4",
				children: triggered.map((window) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("li", { children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Panel, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "flex flex-wrap items-baseline justify-between gap-3",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
						className: "text-xs font-medium uppercase tracking-widest text-muted",
						children: [
							WHEN[window.index],
							" · ",
							window.day.weekday,
							" ",
							window.day.dateLabel
						]
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("h3", {
						className: "mt-2 font-display text-3xl tracking-tight",
						children: [
							window.day.rainfallMm,
							" mm, index ",
							window.dayScore
						]
					})] }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(RiskBadge, { level: window.dayLevel })]
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "mt-4 text-sm text-muted",
					children: window.towns.length ? `Towns at Watch or above: ${window.towns.map((town) => `${town.name} ${town.score}`).join(", ")}.` : "The provincial day is elevated, but no town on the desk clears Watch."
				})] }) }, window.day.id))
			})] }),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "flex flex-wrap gap-3",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Link, {
					to: "/forecast",
					className: buttonClass(),
					children: "Edit the forecast"
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Link, {
					to: "/prediction",
					className: buttonClass("ghost"),
					children: "Read the full call"
				})]
			})
		]
	});
}
//#endregion
export { AlertsPage as component };
