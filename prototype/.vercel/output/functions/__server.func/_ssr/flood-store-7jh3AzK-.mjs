import { i as __toESM } from "../_runtime.mjs";
import { J as require_react, q as require_jsx_runtime } from "../_libs/@tanstack/react-router+[...].mjs";
import { t as clsx } from "../_libs/clsx.mjs";
import { t as twMerge } from "../_libs/tailwind-merge.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/flood-store-7jh3AzK-.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
function cn(...inputs) {
	return twMerge(clsx(inputs));
}
/**
* Sample desk for Laguna.
* Edit the presets, the town list, or the default weights.
* The pages read this file and nothing else for place and weather.
*/
var ISSUE_LABEL = "Sample issue · Fri 6 Nov 2026";
var DEFAULT_WEIGHTS = {
	rainfall: .34,
	peak: .14,
	river: .22,
	soil: .16,
	lake: .14
};
var DEFAULT_SCALES = {
	rainfallMm: 160,
	peakMmHr: 45,
	riverStageM: 2.4,
	lakeRiseM: 2
};
var DEFAULT_THRESHOLDS = {
	watch: 32,
	warning: 52,
	critical: 72
};
var WEEK = [
	{
		id: "d0",
		weekday: "Fri",
		dateLabel: "6 Nov"
	},
	{
		id: "d1",
		weekday: "Sat",
		dateLabel: "7 Nov"
	},
	{
		id: "d2",
		weekday: "Sun",
		dateLabel: "8 Nov"
	},
	{
		id: "d3",
		weekday: "Mon",
		dateLabel: "9 Nov"
	},
	{
		id: "d4",
		weekday: "Tue",
		dateLabel: "10 Nov"
	},
	{
		id: "d5",
		weekday: "Wed",
		dateLabel: "11 Nov"
	},
	{
		id: "d6",
		weekday: "Thu",
		dateLabel: "12 Nov"
	}
];
function days(rows) {
	return WEEK.map((day, index) => {
		const [rainfallMm, peakMmHr, riverStageM, soilPct, lakeRiseM] = rows[index];
		return {
			...day,
			rainfallMm,
			peakMmHr,
			riverStageM,
			soilPct,
			lakeRiseM
		};
	});
}
var PRESETS = [
	{
		id: "habagat",
		name: "Habagat",
		blurb: "A wet southwest monsoon. Heavy rain Saturday and Sunday, with rivers and the lake climbing behind it.",
		days: days([
			[
				68,
				24,
				.9,
				84,
				.85
			],
			[
				125,
				40,
				1.6,
				92,
				1.15
			],
			[
				140,
				42,
				2,
				96,
				1.45
			],
			[
				60,
				18,
				1.6,
				92,
				1.55
			],
			[
				24,
				8,
				1.15,
				84,
				1.4
			],
			[
				8,
				3,
				.7,
				76,
				1.2
			],
			[
				4,
				2,
				.4,
				70,
				1.05
			]
		])
	},
	{
		id: "lake",
		name: "High lake",
		blurb: "Rain is only moderate. Laguna de Bay is already high, so water has nowhere to go.",
		days: days([
			[
				28,
				10,
				.8,
				90,
				1.55
			],
			[
				36,
				14,
				1.1,
				95,
				1.85
			],
			[
				18,
				8,
				1,
				93,
				1.9
			],
			[
				12,
				5,
				.8,
				90,
				1.8
			],
			[
				8,
				3,
				.6,
				86,
				1.65
			],
			[
				5,
				2,
				.4,
				80,
				1.5
			],
			[
				2,
				1,
				.3,
				74,
				1.35
			]
		])
	},
	{
		id: "quiet",
		name: "Quiet week",
		blurb: "Light rain, rivers near normal, the lake close to its reference.",
		days: days([
			[
				4,
				2,
				.15,
				48,
				.1
			],
			[
				8,
				3,
				.2,
				52,
				.12
			],
			[
				3,
				1,
				.15,
				50,
				.1
			],
			[
				1,
				1,
				.1,
				46,
				.08
			],
			[
				0,
				0,
				.1,
				44,
				.08
			],
			[
				2,
				1,
				.1,
				45,
				.1
			],
			[
				6,
				2,
				.15,
				48,
				.12
			]
		])
	}
];
var GROUPS = [
	"West shore",
	"South basin",
	"East delta",
	"Inland"
];
var TOWNS = [
	{
		slug: "san-pedro",
		name: "San Pedro",
		group: "West shore",
		susceptibility: 1.12,
		water: "Lake edge and city drains",
		note: "Dense barangays where the lake and the drains rise together.",
		detail: "San Pedro sits on the northwest corner of Laguna de Bay. Flooding here is usually urban water that cannot leave because the lake is already up, not a river overtopping a bank."
	},
	{
		slug: "binan",
		name: "Biñan",
		group: "West shore",
		susceptibility: 1.16,
		water: "Lakeshore villages",
		note: "Low industrial and housing pockets that hold water once the lake is high.",
		detail: "Biñan’s lakeshore barangays flood when habagat rain meets a lake that is already above its usual line. Water stays in the streets after the rain has eased."
	},
	{
		slug: "santa-rosa",
		name: "Santa Rosa",
		group: "West shore",
		susceptibility: 1.2,
		water: "Santa Rosa River",
		note: "The river and the lakeshore villages. Urban runoff arrives fast.",
		detail: "Santa Rosa floods from two directions: quick runoff in the built-up center, and the Santa Rosa River as it slows near the lake. A high lake makes the river’s exit worse."
	},
	{
		slug: "cabuyao",
		name: "Cabuyao",
		group: "West shore",
		susceptibility: 1.14,
		water: "Diezmo and the lake flats",
		note: "Lakeshore barangays and the river flats south of the city.",
		detail: "Cabuyao’s trouble spots are the low flats toward the lake. Moderate rain is manageable until the lake rise blocks the outlets."
	},
	{
		slug: "calamba",
		name: "Calamba",
		group: "West shore",
		susceptibility: 1.28,
		water: "San Juan River mouth",
		note: "A primary watch town. The San Juan River meets the lake here.",
		detail: "Calamba floods at the San Juan River mouth and along the lake edge. It is one of the first west-shore towns to cross Warning when both rain and the lake are up."
	},
	{
		slug: "los-banos",
		name: "Los Baños",
		group: "South basin",
		susceptibility: 1.18,
		water: "Molawin creek",
		note: "Campus lowlands. Flash rain, then lake backflow.",
		detail: "Los Baños takes fast water off the slopes through Molawin and the creeks, then slow water from the lake. The low campus and shore barangays feel both."
	},
	{
		slug: "bay",
		name: "Bay",
		group: "South basin",
		susceptibility: 1.34,
		water: "Open lake edge",
		note: "One of the lowest shores. Standing water when the lake is up.",
		detail: "Bay is flat against Laguna de Bay. It does not need a cloudburst to flood. A high lake alone puts water into the shore barangays and the fields behind them."
	},
	{
		slug: "calauan",
		name: "Calauan",
		group: "South basin",
		susceptibility: 1.22,
		water: "Farm basin",
		note: "Agricultural basin that drains slowly toward the lake.",
		detail: "Calauan holds water in the fields. Once the soil is full and the lake is high, the basin drains late, so the flood outlasts the rain."
	},
	{
		slug: "victoria",
		name: "Victoria",
		group: "South basin",
		susceptibility: 1.16,
		water: "Narrow shore strip",
		note: "Fields flood before the town proper.",
		detail: "Victoria’s lake edge is a thin strip of fields and barangays. The index runs above the province, but the water usually shows in the fields first."
	},
	{
		slug: "pila",
		name: "Pila",
		group: "South basin",
		susceptibility: 1.14,
		water: "Approach to the delta",
		note: "Lakeshore town on the way toward the Santa Cruz delta.",
		detail: "Pila sits between the south basin and the Pagsanjan River delta. It feels the lake first, then any surge coming down toward Santa Cruz."
	},
	{
		slug: "santa-cruz",
		name: "Santa Cruz",
		group: "East delta",
		susceptibility: 1.3,
		water: "Pagsanjan River delta",
		note: "The capital. Low barangays on the river delta.",
		detail: "Santa Cruz is the provincial capital and a delta town. The Pagsanjan River and the lake meet in the low barangays. It is on the short list whenever the 72-hour call is Warning or higher."
	},
	{
		slug: "lumban",
		name: "Lumban",
		group: "East delta",
		susceptibility: 1.24,
		water: "River town",
		note: "Upstream of Santa Cruz. The stage rises here early.",
		detail: "Lumban is a river town between Pagsanjan and Santa Cruz. Watch the river piece of the model: Lumban feels stage before it feels the lake."
	},
	{
		slug: "pagsanjan",
		name: "Pagsanjan",
		group: "East delta",
		susceptibility: 1.05,
		water: "Gorge and river",
		note: "More flash flood than lake, but the outlet still matters.",
		detail: "Pagsanjan sits higher in the gorge. Its floods are quicker and more about intense rain than about Laguna de Bay. The susceptibility is near the provincial line on purpose."
	},
	{
		slug: "paete",
		name: "Paete",
		group: "East delta",
		susceptibility: 1.12,
		water: "Lakeshore road",
		note: "The shore and the road flood before the slope does.",
		detail: "Paete climbs off the lake. The hazard is the shore road and the first row of houses, not the upper town. A high lake is the piece to watch."
	},
	{
		slug: "siniloan",
		name: "Siniloan",
		group: "East delta",
		susceptibility: 1.18,
		water: "Northern river mouth",
		note: "Northern lake edge, where the river meets the bay.",
		detail: "Siniloan marks the northern end of this desk. River water and the lake meet at the mouth, so both the river piece and the lake piece move the town."
	},
	{
		slug: "san-pablo",
		name: "San Pablo",
		group: "Inland",
		susceptibility: .64,
		water: "Crater lakes, not the bay",
		note: "Higher ground. Local water, not a bay flood.",
		detail: "San Pablo is the inland control on this desk. It can flood locally around the crater lakes, but it does not take Laguna de Bay’s rise. The model keeps it well under the shore towns."
	}
];
function presetById(id) {
	return PRESETS.find((preset) => preset.id === id) ?? null;
}
function townBySlug(slug) {
	return TOWNS.find((town) => town.slug === slug) ?? null;
}
var STORAGE_KEY = "baha-laguna-desk-v1";
var FloodContext = (0, import_react.createContext)(null);
function clamp(n, min, max) {
	if (!Number.isFinite(n)) return min;
	return Math.min(max, Math.max(min, n));
}
function num(value, fallback, min, max) {
	const n = typeof value === "number" ? value : typeof value === "string" ? Number(value) : NaN;
	return clamp(n, min, max) || (Number.isFinite(n) ? clamp(n, min, max) : fallback);
}
function clampDay(day) {
	return {
		...day,
		rainfallMm: clamp(day.rainfallMm, 0, 500),
		peakMmHr: clamp(day.peakMmHr, 0, 200),
		riverStageM: clamp(day.riverStageM, 0, 8),
		soilPct: clamp(day.soilPct, 0, 100),
		lakeRiseM: clamp(day.lakeRiseM, 0, 4)
	};
}
function orderThresholds(thresholds) {
	const watch = clamp(thresholds.watch, 1, 90);
	const warning = clamp(Math.max(thresholds.warning, watch + 1), watch + 1, 95);
	return {
		watch,
		warning,
		critical: clamp(Math.max(thresholds.critical, warning + 1), warning + 1, 99)
	};
}
function defaultState() {
	return {
		days: PRESETS[0].days.map((day) => ({ ...day })),
		weights: { ...DEFAULT_WEIGHTS },
		scales: { ...DEFAULT_SCALES },
		thresholds: { ...DEFAULT_THRESHOLDS },
		presetId: PRESETS[0].id
	};
}
function sanitize(raw) {
	if (!raw || typeof raw !== "object") return null;
	const value = raw;
	if (!Array.isArray(value.days) || value.days.length !== 7) return null;
	const base = defaultState();
	const days = base.days.map((day, index) => {
		const item = value.days?.[index];
		if (!item || typeof item !== "object") return day;
		const row = item;
		return clampDay({
			...day,
			rainfallMm: num(row.rainfallMm, day.rainfallMm, 0, 500),
			peakMmHr: num(row.peakMmHr, day.peakMmHr, 0, 200),
			riverStageM: num(row.riverStageM, day.riverStageM, 0, 8),
			soilPct: num(row.soilPct, day.soilPct, 0, 100),
			lakeRiseM: num(row.lakeRiseM, day.lakeRiseM, 0, 4)
		});
	});
	const weights = { ...base.weights };
	Object.keys(weights).forEach((key) => {
		weights[key] = num(value.weights?.[key], base.weights[key], 0, 1);
	});
	const scales = { ...base.scales };
	scales.rainfallMm = num(value.scales?.rainfallMm, base.scales.rainfallMm, 20, 400);
	scales.peakMmHr = num(value.scales?.peakMmHr, base.scales.peakMmHr, 5, 120);
	scales.riverStageM = num(value.scales?.riverStageM, base.scales.riverStageM, .5, 6);
	scales.lakeRiseM = num(value.scales?.lakeRiseM, base.scales.lakeRiseM, .4, 4);
	return {
		days,
		weights,
		scales,
		thresholds: orderThresholds({
			watch: num(value.thresholds?.watch, base.thresholds.watch, 1, 90),
			warning: num(value.thresholds?.warning, base.thresholds.warning, 2, 95),
			critical: num(value.thresholds?.critical, base.thresholds.critical, 3, 99)
		}),
		presetId: value.presetId === "custom" || presetById(String(value.presetId)) ? String(value.presetId) : "custom"
	};
}
function FloodProvider({ children }) {
	const [state, setState] = (0, import_react.useState)(defaultState);
	const [ready, setReady] = (0, import_react.useState)(false);
	(0, import_react.useEffect)(() => {
		try {
			const loaded = sanitize(JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "null"));
			if (loaded) setState(loaded);
		} catch {}
		setReady(true);
	}, []);
	(0, import_react.useEffect)(() => {
		if (!ready) return;
		localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
	}, [ready, state]);
	const setDay = (0, import_react.useCallback)((id, patch) => {
		setState((current) => ({
			...current,
			presetId: "custom",
			days: current.days.map((day) => day.id === id ? clampDay({
				...day,
				...patch
			}) : day)
		}));
	}, []);
	const setWeight = (0, import_react.useCallback)((key, value) => {
		setState((current) => ({
			...current,
			weights: {
				...current.weights,
				[key]: clamp(value, 0, 1)
			}
		}));
	}, []);
	const setScale = (0, import_react.useCallback)((key, value) => {
		setState((current) => {
			const [min, max] = {
				rainfallMm: [20, 400],
				peakMmHr: [5, 120],
				riverStageM: [.5, 6],
				lakeRiseM: [.4, 4]
			}[key];
			return {
				...current,
				scales: {
					...current.scales,
					[key]: clamp(value, min, max)
				}
			};
		});
	}, []);
	const setThreshold = (0, import_react.useCallback)((key, value) => {
		setState((current) => ({
			...current,
			thresholds: orderThresholds({
				...current.thresholds,
				[key]: value
			})
		}));
	}, []);
	const applyPreset = (0, import_react.useCallback)((id) => {
		const preset = presetById(id);
		if (!preset) return;
		setState((current) => ({
			...current,
			presetId: preset.id,
			days: preset.days.map((day) => ({ ...day }))
		}));
	}, []);
	const restoreDefaults = (0, import_react.useCallback)(() => {
		setState(defaultState());
	}, []);
	const value = (0, import_react.useMemo)(() => ({
		...state,
		ready,
		setDay,
		setWeight,
		setScale,
		setThreshold,
		applyPreset,
		restoreDefaults
	}), [
		state,
		ready,
		setDay,
		setWeight,
		setScale,
		setThreshold,
		applyPreset,
		restoreDefaults
	]);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(FloodContext.Provider, {
		value,
		children
	});
}
function useFlood() {
	const value = (0, import_react.useContext)(FloodContext);
	if (!value) throw new Error("useFlood must be used inside FloodProvider");
	return value;
}
//#endregion
export { TOWNS as a, useFlood as c, PRESETS as i, GROUPS as n, cn as o, ISSUE_LABEL as r, townBySlug as s, FloodProvider as t };
