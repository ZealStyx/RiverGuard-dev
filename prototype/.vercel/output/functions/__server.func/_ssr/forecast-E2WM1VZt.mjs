import { b as Link, q as require_jsx_runtime } from "../_libs/@tanstack/react-router+[...].mjs";
import { i as PRESETS, o as cn } from "./flood-store-7jh3AzK-.mjs";
import { n as buttonClass, t as Panel } from "./panel-HIGEir_A.mjs";
import { t as PageIntro } from "./page-intro-C46OT0Gq.mjs";
import { d as roundIndex, h as verdictTitle, m as useOutlook, n as PARTS, r as RiskBadge, s as dayParts, t as HORIZON_BLEND, u as levelOf } from "./use-outlook-DXuFgiND.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/forecast-E2WM1VZt.js
var import_jsx_runtime = require_jsx_runtime();
var FIELDS = [
	{
		key: "rainfallMm",
		label: "Rain mm",
		step: "1"
	},
	{
		key: "peakMmHr",
		label: "Peak mm/h",
		step: "1"
	},
	{
		key: "riverStageM",
		label: "River m",
		step: "0.1"
	},
	{
		key: "soilPct",
		label: "Soil %",
		step: "1"
	},
	{
		key: "lakeRiseM",
		label: "Lake m",
		step: "0.05"
	}
];
function ForecastPage() {
	const { days, presetId, config, score, level, applyPreset, setDay } = useOutlook();
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "grid gap-8",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(PageIntro, {
					kicker: "Model input",
					title: "The forecast",
					lede: "These five numbers are the only thing the model reads. Change a day and the flood call on every other page moves with it."
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "rounded-2xl bg-card px-5 py-4 shadow-card lg:shrink-0",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "text-xs font-medium uppercase tracking-widest text-muted",
							children: "72-hour call"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "mt-2 flex items-end gap-3",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
								className: "font-display text-4xl tabular-nums leading-none",
								children: score
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(RiskBadge, { level })]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "mt-2 text-sm text-muted",
							children: verdictTitle(level)
						})
					]
				})]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "flex flex-wrap gap-2",
				children: [PRESETS.map((preset) => {
					const active = preset.id === presetId;
					return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
						type: "button",
						onClick: () => applyPreset(preset.id),
						className: cn("h-11 rounded-full px-4 text-sm font-medium transition-colors", active ? "bg-ink text-card" : "bg-card text-ink shadow-card hover:shadow-card-hover"),
						"aria-pressed": active,
						children: preset.name
					}, preset.id);
				}), presetId === "custom" ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
					className: "inline-flex h-11 items-center text-sm text-muted",
					children: "Edited by hand"
				}) : null]
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "mt-3 max-w-2xl text-sm text-muted",
				children: PRESETS.find((preset) => preset.id === presetId)?.blurb ?? "You changed a number. Pick a sample scenario any time to put the weather back."
			})] }),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("ul", {
				className: "grid gap-4",
				children: days.map((day, index) => {
					const dayScore = roundIndex(dayParts(day, config).score);
					const dayLevel = levelOf(dayScore, config.thresholds);
					const blend = HORIZON_BLEND[index];
					return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("li", { children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Panel, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "flex flex-wrap items-baseline justify-between gap-3",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("h2", {
							className: "font-display text-3xl tracking-tight",
							children: [
								day.weekday,
								" ",
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
									className: "text-muted",
									children: day.dateLabel
								})
							]
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "mt-1 text-sm text-muted",
							children: blend != null ? `Counts as ${Math.round(blend * 100)}% of the 72-hour call` : "Outside the 72-hour call. Kept so the week still reads as a forecast."
						})] }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "flex items-center gap-3",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
								className: "font-display text-3xl tabular-nums",
								children: dayScore
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(RiskBadge, { level: dayLevel })]
						})]
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "mt-5 grid grid-cols-2 gap-3 sm:grid-cols-5",
						children: FIELDS.map((field) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
							className: "block",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
								className: "mb-1 block text-xs font-medium uppercase tracking-wide text-muted",
								children: field.label
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
								className: "h-11 w-full rounded-xl border border-line bg-paper px-3 text-ink tabular-nums outline-none focus:border-water",
								type: "number",
								inputMode: "decimal",
								min: 0,
								step: field.step,
								value: day[field.key],
								onChange: (event) => {
									const next = Number(event.target.value);
									setDay(day.id, { [field.key]: Number.isFinite(next) ? next : 0 });
								},
								onFocus: (event) => event.currentTarget.select()
							})]
						}, field.key))
					})] }) }, day.id);
				})
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "grid gap-4 sm:grid-cols-2 lg:grid-cols-5",
				children: PARTS.map((part) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
					className: "text-sm text-muted",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
						className: "font-medium text-ink",
						children: [part.label, ". "]
					}), part.blurb]
				}, part.key))
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "text-sm text-muted",
				children: "Scenarios replace the weather only. Weights and scales stay put until you change them on the model page."
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Link, {
				to: "/model",
				className: buttonClass("ghost"),
				children: "Adjust the model"
			}) })
		]
	});
}
//#endregion
export { ForecastPage as component };
