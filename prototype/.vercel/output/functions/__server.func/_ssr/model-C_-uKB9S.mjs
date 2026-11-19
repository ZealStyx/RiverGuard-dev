import { q as require_jsx_runtime } from "../_libs/@tanstack/react-router+[...].mjs";
import { n as buttonClass, t as Panel } from "./panel-HIGEir_A.mjs";
import { t as PageIntro } from "./page-intro-C46OT0Gq.mjs";
import { h as verdictTitle, i as SCALE_FIELDS, m as useOutlook, n as PARTS, r as RiskBadge } from "./use-outlook-DXuFgiND.mjs";
import { t as IndexMeter } from "./meter-Y3HCWN0b.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/model-C_-uKB9S.js
var import_jsx_runtime = require_jsx_runtime();
function ModelPage() {
	const { weights, scales, thresholds, score, level, setWeight, setScale, setThreshold, restoreDefaults } = useOutlook();
	const weightSum = weights.rainfall + weights.peak + weights.river + weights.soil + weights.lake || 1;
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "grid gap-6",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(PageIntro, {
					kicker: "Stand-in model",
					title: "The scoring mix",
					lede: "A transparent stand-in, not a trained network. Move the mix, the scales, or the thresholds. The desk, the prediction, the towns, and the alerts all use whatever you set here."
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "rounded-2xl bg-card px-5 py-4 shadow-card lg:shrink-0",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "text-xs font-medium uppercase tracking-widest text-muted",
							children: "Live 72-hour index"
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
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Panel, { children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
					className: "font-display text-2xl tracking-tight",
					children: "How a day becomes an index"
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("ol", {
					className: "mt-4 grid gap-4 sm:grid-cols-3",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Step, {
							n: "1",
							title: "Scale each input",
							body: "Rain, peak rate, river stage, and lake rise are divided by the extreme you set. Soil is divided by 100. Each piece stops at 1."
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Step, {
							n: "2",
							title: "Weight and add",
							body: "Each piece is multiplied by its weight. The weights are normalized, so only the mix matters, then scaled to 0–100."
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Step, {
							n: "3",
							title: "Blend 72 hours",
							body: "Today is half, tomorrow is 30 percent, the next day is 20. A town multiplies that provincial index by its exposure."
						})
					]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "mt-6",
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(IndexMeter, {
						score,
						level,
						thresholds
					})
				})
			] }),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "grid gap-6 lg:grid-cols-2",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Panel, { children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
						className: "font-display text-2xl tracking-tight",
						children: "Weights"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "mt-2 text-sm text-muted",
						children: "Share of the mix after normalizing. Set a piece to zero to ignore it."
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("ul", {
						className: "mt-5 grid gap-5",
						children: PARTS.map((part) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("li", { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(WeightRow, {
							label: part.label,
							value: weights[part.key],
							share: weights[part.key] / weightSum,
							onChange: (value) => setWeight(part.key, value)
						}) }, part.key))
					})
				] }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "grid gap-6",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Panel, { children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
							className: "font-display text-2xl tracking-tight",
							children: "What counts as extreme"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "mt-2 text-sm text-muted",
							children: "Lower a scale and the same weather scores as more dangerous."
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("ul", {
							className: "mt-5 grid gap-4",
							children: SCALE_FIELDS.map((field) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("li", { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(NumberRow, {
								label: field.label,
								hint: field.blurb,
								unit: field.unit,
								value: scales[field.key],
								step: field.key === "rainfallMm" || field.key === "peakMmHr" ? "1" : "0.1",
								onChange: (value) => setScale(field.key, value)
							}) }, field.key))
						})
					] }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Panel, { children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
							className: "font-display text-2xl tracking-tight",
							children: "Thresholds"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "mt-2 text-sm text-muted",
							children: "The index has to clear these lines. They stay in order if you cross them."
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("ul", {
							className: "mt-5 grid gap-4",
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)(ThresholdRow, {
									label: "Watch",
									value: thresholds.watch,
									onChange: (value) => setThreshold("watch", value)
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)(ThresholdRow, {
									label: "Warning",
									value: thresholds.warning,
									onChange: (value) => setThreshold("warning", value)
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)(ThresholdRow, {
									label: "Critical",
									value: thresholds.critical,
									onChange: (value) => setThreshold("critical", value)
								})
							]
						})
					] })]
				})]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
				type: "button",
				onClick: restoreDefaults,
				className: buttonClass("ghost"),
				children: "Restore the sample desk"
			}) })
		]
	});
}
function Step({ n, title, body }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", { children: [
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
			className: "font-display text-3xl text-water",
			children: n
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h3", {
			className: "mt-2 font-medium",
			children: title
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
			className: "mt-1 text-sm text-muted",
			children: body
		})
	] });
}
function WeightRow({ label, value, share, onChange }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
		className: "block",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
			className: "flex items-baseline justify-between gap-3 text-sm",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
				className: "font-medium",
				children: label
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
				className: "tabular-nums text-muted",
				children: [Math.round(share * 100), "% of the mix"]
			})]
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
			className: "mt-2 h-11 w-full accent-water",
			type: "range",
			min: 0,
			max: 100,
			value: Math.round(value * 100),
			onChange: (event) => onChange(Number(event.target.value) / 100)
		})]
	});
}
function NumberRow({ label, hint, unit, value, step, onChange }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
		className: "grid gap-2 sm:grid-cols-[1fr_7rem] sm:items-center",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
			className: "block text-sm font-medium",
			children: label
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
			className: "mt-0.5 block text-sm text-muted",
			children: hint
		})] }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
			className: "flex items-center gap-2",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
				className: "h-11 w-full rounded-xl border border-line bg-paper px-3 tabular-nums outline-none focus:border-water",
				type: "number",
				inputMode: "decimal",
				min: 0,
				step,
				value,
				onChange: (event) => {
					const next = Number(event.target.value);
					onChange(Number.isFinite(next) ? next : value);
				}
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
				className: "w-10 shrink-0 text-sm text-muted",
				children: unit
			})]
		})]
	});
}
function ThresholdRow({ label, value, onChange }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(NumberRow, {
		label,
		hint: "Index points, out of 100.",
		unit: "pts",
		value,
		step: "1",
		onChange
	});
}
//#endregion
export { ModelPage as component };
