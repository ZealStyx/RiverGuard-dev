import { i as __toESM } from "../_runtime.mjs";
import { J as require_react, q as require_jsx_runtime } from "../_libs/@tanstack/react-router+[...].mjs";
import { a as TOWNS, c as useFlood, o as cn } from "./flood-store-7jh3AzK-.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/use-outlook-DXuFgiND.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
var HORIZON_BLEND = [
	.5,
	.3,
	.2
];
var PARTS = [
	{
		key: "rainfall",
		label: "Rainfall",
		unit: "mm",
		blurb: "Total rain expected in that 24 hours."
	},
	{
		key: "peak",
		label: "Peak rate",
		unit: "mm/h",
		blurb: "The strongest single hour. Bursts overwhelm drains before the daily total looks bad."
	},
	{
		key: "river",
		label: "River stage",
		unit: "m",
		blurb: "Meters above a normal stage, not above the sea."
	},
	{
		key: "soil",
		label: "Soil",
		unit: "%",
		blurb: "How full the ground already is. At 100 it cannot take more water."
	},
	{
		key: "lake",
		label: "Lake rise",
		unit: "m",
		blurb: "Laguna de Bay, in meters above the 10.5 m reference. A high lake slows every outlet."
	}
];
var SCALE_FIELDS = [
	{
		key: "rainfallMm",
		part: "rainfall",
		label: "Extreme day of rain",
		unit: "mm",
		blurb: "A day this wet scores full on the rainfall piece."
	},
	{
		key: "peakMmHr",
		part: "peak",
		label: "Extreme hourly burst",
		unit: "mm/h",
		blurb: "A burst this strong scores full on the peak piece."
	},
	{
		key: "riverStageM",
		part: "river",
		label: "Extreme river stage",
		unit: "m",
		blurb: "Stage this far above normal scores full on the river piece."
	},
	{
		key: "lakeRiseM",
		part: "lake",
		label: "Extreme lake rise",
		unit: "m",
		blurb: "A lake this far above 10.5 m scores full on the lake piece."
	}
];
var PART_STORY = {
	rainfall: "24-hour rainfall",
	peak: "intense hourly bursts",
	river: "rivers already running high",
	soil: "saturated ground",
	lake: "a high Laguna de Bay"
};
function clamp(n, min, max) {
	if (!Number.isFinite(n)) return min;
	return Math.min(max, Math.max(min, n));
}
function unit(value, scale) {
	if (scale <= 0) return 0;
	return clamp(value / scale, 0, 1);
}
function roundIndex(n) {
	if (!Number.isFinite(n)) return 0;
	return Math.round(n);
}
function dayParts(day, config) {
	const { weights, scales } = config;
	const weighted = {
		rainfall: unit(day.rainfallMm, scales.rainfallMm) * weights.rainfall,
		peak: unit(day.peakMmHr, scales.peakMmHr) * weights.peak,
		river: unit(day.riverStageM, scales.riverStageM) * weights.river,
		soil: unit(day.soilPct, 100) * weights.soil,
		lake: unit(day.lakeRiseM, scales.lakeRiseM) * weights.lake
	};
	const wsum = weights.rainfall + weights.peak + weights.river + weights.soil + weights.lake;
	const factor = wsum > 0 ? 100 / wsum : 0;
	const points = {
		rainfall: weighted.rainfall * factor,
		peak: weighted.peak * factor,
		river: weighted.river * factor,
		soil: weighted.soil * factor,
		lake: weighted.lake * factor
	};
	return {
		points,
		score: points.rainfall + points.peak + points.river + points.soil + points.lake
	};
}
function horizon(days, config) {
	const points = {
		rainfall: 0,
		peak: 0,
		river: 0,
		soil: 0,
		lake: 0
	};
	const daily = [];
	let score = 0;
	let blendSum = 0;
	days.forEach((day, index) => {
		const part = dayParts(day, config);
		daily.push(part.score);
		const blend = HORIZON_BLEND[index];
		if (blend == null) return;
		blendSum += blend;
		score += part.score * blend;
		Object.keys(points).forEach((key) => {
			points[key] += part.points[key] * blend;
		});
	});
	if (blendSum > 0) {
		score /= blendSum;
		Object.keys(points).forEach((key) => {
			points[key] /= blendSum;
		});
	}
	return {
		score,
		points,
		daily
	};
}
function townIndex(provincial, susceptibility) {
	return clamp(provincial * susceptibility, 0, 100);
}
function levelOf(score, thresholds) {
	if (score >= thresholds.critical) return "critical";
	if (score >= thresholds.warning) return "warning";
	if (score >= thresholds.watch) return "watch";
	return "low";
}
function levelLabel(level) {
	if (level === "low") return "Low";
	if (level === "watch") return "Watch";
	if (level === "warning") return "Warning";
	return "Critical";
}
function verdictTitle(level) {
	if (level === "critical") return "Flooding is likely";
	if (level === "warning") return "Flooding is possible";
	if (level === "watch") return "No flood call yet";
	return "No flood signal";
}
function leadingKey(points) {
	return Object.keys(points).reduce((best, key) => points[key] > points[best] ? key : best);
}
function callNarrative(level, points, topTowns) {
	const story = PART_STORY[leadingKey(points)];
	const place = topTowns.length ? ` Hottest on the desk: ${topTowns.join(", ")}.` : "";
	if (level === "low") return `No flood call. The largest piece of a small index is ${story}, and it stays under Watch.`;
	if (level === "watch") return `Not a flood call yet. The index is being lifted by ${story}.${place}`;
	if (level === "warning") return `Flooding is possible on low ground if this forecast verifies. The call is led by ${story}.${place}`;
	return `Flooding is likely along the lakeshore and the river mouths. The call is led by ${story}.${place}`;
}
function confidenceOf(score, thresholds) {
	const dist = Math.min(Math.abs(score - thresholds.watch), Math.abs(score - thresholds.warning), Math.abs(score - thresholds.critical));
	if (dist < 6) return {
		label: "Soft",
		note: "The index sits near a threshold. A small forecast change can flip the call."
	};
	if (dist < 14) return {
		label: "Steady",
		note: "The call holds unless a whole rain band is added or taken out."
	};
	return {
		label: "Firm",
		note: "The index is well clear of the nearest threshold."
	};
}
function smsText(level, score, names) {
	const who = names.slice(0, 3).join(", ") || "no town";
	return `BAHA Laguna: ${levelLabel(level).toUpperCase()} next 72h. Index ${score}. Highest: ${who}. Prototype, not a PAGASA warning.`;
}
var STYLES = {
	low: "bg-water-soft text-water",
	watch: "bg-card text-ink shadow-card",
	warning: "bg-clay-soft text-clay",
	critical: "bg-clay text-card"
};
function RiskBadge({ level }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
		className: cn("inline-flex h-7 shrink-0 items-center rounded-full px-2.5 text-xs font-medium", STYLES[level]),
		children: levelLabel(level)
	});
}
function useOutlook() {
	const flood = useFlood();
	const config = (0, import_react.useMemo)(() => ({
		weights: flood.weights,
		scales: flood.scales,
		thresholds: flood.thresholds
	}), [
		flood.weights,
		flood.scales,
		flood.thresholds
	]);
	const view = (0, import_react.useMemo)(() => {
		const outlook = horizon(flood.days, config);
		const score = roundIndex(outlook.score);
		return {
			outlook,
			score,
			level: levelOf(score, config.thresholds),
			ranked: TOWNS.map((town) => {
				const townScore = roundIndex(townIndex(outlook.score, town.susceptibility));
				return {
					town,
					score: townScore,
					level: levelOf(townScore, config.thresholds)
				};
			}).sort((a, b) => b.score - a.score || a.town.name.localeCompare(b.town.name))
		};
	}, [flood.days, config]);
	return {
		...flood,
		config,
		...view
	};
}
//#endregion
export { callNarrative as a, leadingKey as c, roundIndex as d, smsText as f, verdictTitle as h, SCALE_FIELDS as i, levelLabel as l, useOutlook as m, PARTS as n, confidenceOf as o, townIndex as p, RiskBadge as r, dayParts as s, HORIZON_BLEND as t, levelOf as u };
