import { i as __toESM } from "../_runtime.mjs";
import { J as require_react, b as Link, q as require_jsx_runtime } from "../_libs/@tanstack/react-router+[...].mjs";
import { i as PRESETS, r as ISSUE_LABEL } from "./flood-store-7jh3AzK-.mjs";
import { n as buttonClass, t as Panel } from "./panel-HIGEir_A.mjs";
import { a as callNarrative, d as roundIndex, h as verdictTitle, l as levelLabel, m as useOutlook, o as confidenceOf, r as RiskBadge, t as HORIZON_BLEND, u as levelOf } from "./use-outlook-DXuFgiND.mjs";
import { t as IndexMeter } from "./meter-Y3HCWN0b.mjs";
import { r as ArrowUpRight } from "../_libs/lucide-react.mjs";
import { a as Bar, i as CartesianGrid, n as YAxis, o as ResponsiveContainer, r as XAxis, s as Tooltip, t as ComposedChart } from "../_libs/recharts+[...].mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/routes-BuIuFEz9.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
function RainChart({ rows }) {
	const [ready, setReady] = (0, import_react.useState)(false);
	(0, import_react.useEffect)(() => setReady(true), []);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
		className: "h-56 w-full min-w-0",
		"aria-hidden": ready ? void 0 : true,
		children: ready ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ResponsiveContainer, {
			width: "100%",
			height: "100%",
			children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(ComposedChart, {
				data: rows,
				margin: {
					top: 8,
					right: 4,
					left: 0,
					bottom: 0
				},
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(CartesianGrid, {
						vertical: false,
						stroke: "var(--color-line)"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(XAxis, {
						dataKey: "label",
						tick: {
							fill: "var(--color-muted)",
							fontSize: 12
						},
						tickLine: false,
						axisLine: false
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(YAxis, {
						width: 36,
						tick: {
							fill: "var(--color-muted)",
							fontSize: 12
						},
						tickLine: false,
						axisLine: false,
						unit: ""
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Tooltip, {
						cursor: { fill: "var(--color-water-soft)" },
						content: ({ active, payload, label }) => {
							if (!active || !payload?.length) return null;
							const value = payload[0]?.value;
							return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "rounded-lg bg-ink px-3 py-2 text-sm text-card shadow-card",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { children: label }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
									className: "tabular-nums",
									children: [value, " mm"]
								})]
							});
						}
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Bar, {
						dataKey: "rain",
						name: "Rain",
						fill: "var(--color-water)",
						radius: [
							4,
							4,
							0,
							0
						],
						maxBarSize: 36
					})
				]
			})
		}) : null
	});
}
function DeskPage() {
	const { days, presetId, thresholds, outlook, score, level, ranked } = useOutlook();
	const preset = PRESETS.find((item) => item.id === presetId);
	const confidence = confidenceOf(score, thresholds);
	const horizonDays = days.slice(0, 3);
	const rain72 = horizonDays.reduce((sum, day) => sum + day.rainfallMm, 0);
	const peak = Math.max(...horizonDays.map((day) => day.peakMmHr));
	const river = Math.max(...horizonDays.map((day) => day.riverStageM));
	const soil = Math.max(...horizonDays.map((day) => day.soilPct));
	const lake = Math.max(...horizonDays.map((day) => day.lakeRiseM));
	const hotNames = ranked.filter((item) => item.level === "warning" || item.level === "critical").slice(0, 3).map((item) => item.town.name);
	const narrative = callNarrative(level, outlook.points, hotNames);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "grid gap-6 lg:grid-cols-5",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "min-w-0 lg:col-span-3",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "text-xs font-medium uppercase tracking-widest text-water",
						children: preset ? preset.name : "Custom forecast"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", {
						className: "mt-2 max-w-xl font-display text-4xl tracking-tight text-ink sm:text-5xl",
						children: verdictTitle(level)
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "mt-3 max-w-xl text-base text-muted",
						children: "The next 72 hours, scored from rainfall, river stage, soil, and Laguna de Bay."
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "mt-6 flex flex-wrap items-end gap-4",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "font-display text-6xl tabular-nums leading-none",
							children: score
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "pb-1",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(RiskBadge, { level }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
								className: "mt-1 text-sm text-muted",
								children: [
									"72-hour index · ",
									confidence.label,
									" confidence"
								]
							})]
						})]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "mt-6 max-w-xl",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(IndexMeter, {
							score,
							level,
							thresholds
						})
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "mt-6 max-w-xl text-base",
						children: narrative
					})
				]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Panel, {
				className: "lg:col-span-2",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "text-xs font-medium uppercase tracking-widest text-muted",
						children: "This issue"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "mt-2 font-display text-2xl tracking-tight",
						children: ISSUE_LABEL
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "mt-2 text-sm text-muted",
						children: confidence.note
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("dl", {
						className: "mt-4 divide-y divide-line",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Stat, {
								label: "Rain, next 72h",
								value: `${rain72} mm`
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Stat, {
								label: "Strongest hour",
								value: `${peak} mm/h`
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Stat, {
								label: "Highest river stage",
								value: `+${river.toFixed(1)} m`
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Stat, {
								label: "Wettest soil",
								value: `${soil}%`
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Stat, {
								label: "Highest lake rise",
								value: `+${lake.toFixed(2)} m`
							})
						]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Link, {
						to: "/forecast",
						className: `${buttonClass()} mt-6 w-full`,
						children: ["Edit the forecast", /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ArrowUpRight, {
							className: "size-4",
							"aria-hidden": true
						})]
					})
				]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Panel, {
				className: "min-w-0 lg:col-span-3",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "flex items-baseline justify-between gap-3",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
							className: "font-display text-2xl tracking-tight",
							children: "Seven-day rain"
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "text-sm text-muted",
							children: "Millimeters"
						})]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("ol", {
						className: "mt-4 flex gap-2 overflow-x-auto pb-1",
						children: days.map((day, index) => {
							const dayScore = roundIndex(outlook.daily[index] ?? 0);
							const dayLevel = levelOf(dayScore, thresholds);
							const inCall = index < HORIZON_BLEND.length;
							return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", {
								className: "min-w-20 flex-1 rounded-xl bg-paper px-2 py-3 text-center",
								children: [
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
										className: "text-xs text-muted",
										children: day.weekday
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
										className: "mt-1 text-lg font-medium tabular-nums",
										children: day.rainfallMm
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
										className: "text-xs text-muted",
										children: "mm"
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
										className: `mt-2 text-xs font-medium ${tone(dayLevel)}`,
										children: levelLabel(dayLevel)
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
										className: "mt-1 text-xs text-muted",
										children: inCall ? "72h" : "Later"
									})
								]
							}, day.id);
						})
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "mt-4",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(RainChart, { rows: days.map((day) => ({
							label: day.weekday,
							rain: day.rainfallMm
						})) })
					})
				]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Panel, {
				className: "lg:col-span-2",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "flex items-baseline justify-between gap-3",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
						className: "font-display text-2xl tracking-tight",
						children: "Hottest towns"
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Link, {
						to: "/towns",
						className: "text-sm font-medium text-water",
						children: "All towns"
					})]
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("ul", {
					className: "mt-2 divide-y divide-line",
					children: ranked.slice(0, 5).map((item) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("li", { children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Link, {
						to: "/town/$slug",
						params: { slug: item.town.slug },
						className: "flex items-center gap-3 py-3",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
								className: "w-10 font-display text-2xl tabular-nums",
								children: item.score
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
								className: "min-w-0 flex-1",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
									className: "block font-medium",
									children: item.town.name
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
									className: "block text-sm text-muted",
									children: item.town.group
								})]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(RiskBadge, { level: item.level })
						]
					}) }, item.town.slug))
				})]
			})
		]
	});
}
function tone(level) {
	if (level === "warning" || level === "critical") return "text-clay";
	if (level === "low") return "text-water";
	return "text-ink";
}
function Stat({ label, value }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "flex items-baseline justify-between gap-4 py-3",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("dt", {
			className: "text-sm text-muted",
			children: label
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("dd", {
			className: "font-medium tabular-nums",
			children: value
		})]
	});
}
//#endregion
export { DeskPage as component };
