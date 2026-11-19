import { b as Link, q as require_jsx_runtime } from "../_libs/@tanstack/react-router+[...].mjs";
import { n as buttonClass, t as Panel } from "./panel-HIGEir_A.mjs";
import { t as PageIntro } from "./page-intro-C46OT0Gq.mjs";
import { a as callNarrative, c as leadingKey, d as roundIndex, h as verdictTitle, m as useOutlook, n as PARTS, o as confidenceOf, r as RiskBadge, s as dayParts, t as HORIZON_BLEND, u as levelOf } from "./use-outlook-DXuFgiND.mjs";
import { t as IndexMeter } from "./meter-Y3HCWN0b.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/prediction-BMStVOID.js
var import_jsx_runtime = require_jsx_runtime();
var WHEN = [
	"Today",
	"Tomorrow",
	"The day after"
];
function PredictionPage() {
	const { days, outlook, score, level, thresholds, config, ranked } = useOutlook();
	const confidence = confidenceOf(score, thresholds);
	const hot = ranked.filter((item) => item.score >= thresholds.watch).slice(0, 3);
	const narrative = callNarrative(level, outlook.points, hot.map((item) => item.town.name));
	const lead = leadingKey(outlook.points);
	const maxPoint = Math.max(...PARTS.map((part) => outlook.points[part.key]), 1);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "grid gap-6",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(PageIntro, {
				kicker: "Model output",
				title: verdictTitle(level),
				lede: "Scored from the first three forecast days. Today is half the call, tomorrow is 30 percent, and the day after is 20."
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "grid gap-6 lg:grid-cols-5",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Panel, {
					className: "lg:col-span-3",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "flex flex-wrap items-end justify-between gap-4",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
								className: "text-xs font-medium uppercase tracking-widest text-muted",
								children: "72-hour index"
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
								className: "mt-2 font-display text-6xl tabular-nums leading-none",
								children: score
							})] }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "pb-1 text-right",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(RiskBadge, { level }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
									className: "mt-2 text-sm text-muted",
									children: [confidence.label, " confidence"]
								})]
							})]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "mt-6",
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(IndexMeter, {
								score,
								level,
								thresholds
							})
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "mt-6 text-base",
							children: narrative
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "mt-3 text-sm text-muted",
							children: confidence.note
						})
					]
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Panel, {
					className: "lg:col-span-2",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
							className: "font-display text-2xl tracking-tight",
							children: "What is driving it"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("ul", {
							className: "mt-4 grid gap-4",
							children: PARTS.map((part) => {
								const points = outlook.points[part.key];
								const width = Math.max(0, Math.min(100, points / maxPoint * 100));
								const leader = part.key === lead;
								return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "flex items-baseline justify-between gap-3 text-sm",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
										className: leader ? "font-medium text-ink" : "text-muted",
										children: part.label
									}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
										className: "tabular-nums",
										children: points.toFixed(1)
									})]
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
									className: "mt-1 h-2 overflow-hidden rounded-full bg-line",
									children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
										className: leader ? "h-full rounded-full bg-clay" : "h-full rounded-full bg-water",
										style: { width: `${width}%` }
									})
								})] }, part.key);
							})
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "mt-4 text-sm text-muted",
							children: "Points add up to the index. The clay bar is the piece leading this call."
						})
					]
				})]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "grid gap-4 lg:grid-cols-3",
				children: days.slice(0, 3).map((day, index) => {
					const part = dayParts(day, config);
					const dayScore = roundIndex(part.score);
					const dayLevel = levelOf(dayScore, thresholds);
					return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Panel, { children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
							className: "text-xs font-medium uppercase tracking-widest text-muted",
							children: [
								WHEN[index],
								" · ",
								Math.round(HORIZON_BLEND[index] * 100),
								"%"
							]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("h2", {
							className: "mt-2 font-display text-3xl tracking-tight",
							children: [
								day.weekday,
								" ",
								day.dateLabel
							]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "mt-3 flex items-center gap-3",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
								className: "font-display text-4xl tabular-nums",
								children: dayScore
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(RiskBadge, { level: dayLevel })]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("dl", {
							className: "mt-4 grid grid-cols-2 gap-y-2 text-sm",
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Fact, {
									label: "Rain",
									value: `${day.rainfallMm} mm`
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Fact, {
									label: "Peak",
									value: `${day.peakMmHr} mm/h`
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Fact, {
									label: "River",
									value: `+${day.riverStageM.toFixed(1)} m`
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Fact, {
									label: "Soil",
									value: `${day.soilPct}%`
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Fact, {
									label: "Lake",
									value: `+${day.lakeRiseM.toFixed(2)} m`
								})
							]
						})
					] }, day.id);
				})
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Panel, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "flex flex-wrap items-baseline justify-between gap-3",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
					className: "font-display text-2xl tracking-tight",
					children: "Towns on this call"
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Link, {
					to: "/towns",
					className: "text-sm font-medium text-water",
					children: "Open the town list"
				})]
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("ul", {
				className: "mt-3 divide-y divide-line",
				children: ranked.slice(0, 6).map((item) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", {
					className: "flex items-center gap-3 py-3",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
							className: "w-10 font-display text-2xl tabular-nums",
							children: item.score
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
							className: "min-w-0 flex-1",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Link, {
								to: "/town/$slug",
								params: { slug: item.town.slug },
								className: "font-medium",
								children: item.town.name
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
								className: "mt-0.5 block text-sm text-muted",
								children: item.town.note
							})]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(RiskBadge, { level: item.level })
					]
				}, item.town.slug))
			})] }),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "flex flex-wrap gap-3",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Link, {
					to: "/forecast",
					className: buttonClass(),
					children: "Change the forecast"
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Link, {
					to: "/model",
					className: buttonClass("ghost"),
					children: "Change the weights"
				})]
			})
		]
	});
}
function Fact({ label, value }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("dt", {
		className: "text-muted",
		children: label
	}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("dd", {
		className: "text-right tabular-nums",
		children: value
	})] });
}
//#endregion
export { PredictionPage as component };
