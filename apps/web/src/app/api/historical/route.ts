import { readFile } from "node:fs/promises";
import { access } from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";

interface HistoricalRow {
  Date: string;
  Location: string;
  Rainfall_mm: string;
  WaterLevel_m: string;
  RainSource: string;
  QualityStatus: string;
}

interface MonthlyRow {
  Month: string;
  Rain_Manila_mm: string;
  Rain_Marikina_mm: string;
  Rain_Pasig_mm: string;
  Rain_QuezonCity_mm: string;
}

function parseCsv(text: string) {
  const rows: string[][] = [];
  let row: string[] = [];
  let value = "";
  let quoted = false;
  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    const next = text[index + 1];
    if (char === '"' && quoted && next === '"') {
      value += '"';
      index += 1;
    } else if (char === '"') {
      quoted = !quoted;
    } else if (char === "," && !quoted) {
      row.push(value);
      value = "";
    } else if ((char === "\n" || char === "\r") && !quoted) {
      if (char === "\r" && next === "\n") index += 1;
      row.push(value);
      rows.push(row);
      row = [];
      value = "";
    } else {
      value += char;
    }
  }
  if (value.length > 0 || row.length > 0) {
    row.push(value);
    rows.push(row);
  }
  return rows.filter((current) => current.some((cell) => cell.length > 0));
}

function parseMeasurement(value: string) {
  if (!value.trim()) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

async function findDatasetPath() {
  const candidates = [
    path.join(process.cwd(), "data", "daily_observations.csv"),
    path.join(process.cwd(), "..", "..", "data", "daily_observations.csv"),
  ];
  for (const candidate of candidates) {
    try {
      await access(candidate);
      return candidate;
    } catch {
      // Continue to the next workspace layout candidate.
    }
  }
  return null;
}

async function findMonthlyPath() {
  const candidates = [
    path.join(process.cwd(), "data", "monthly_summary.csv"),
    path.join(process.cwd(), "..", "..", "data", "monthly_summary.csv"),
  ];
  for (const candidate of candidates) {
    try {
      await access(candidate);
      return candidate;
    } catch {
      // Continue to the next workspace layout candidate.
    }
  }
  return null;
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const location = url.searchParams.get("location") ?? "Marikina";
  const mode = url.searchParams.get("mode") ?? "daily";
  const start = url.searchParams.get("start");
  const end = url.searchParams.get("end");
  const limit = Math.min(
    Math.max(Number(url.searchParams.get("limit") ?? 7), 1),
    60,
  );
  const datasetPath = await findDatasetPath();
  if (!datasetPath) {
    return NextResponse.json(
      { error: "Historical dataset is not available in this checkout." },
      { status: 503 },
    );
  }

  if (mode === "monthly") {
    const monthlyPath = await findMonthlyPath();
    if (!monthlyPath) {
      return NextResponse.json(
        { error: "Monthly summary is not available in this checkout." },
        { status: 503 },
      );
    }
    const column = `Rain_${location.replace(" ", "")}_mm` as keyof MonthlyRow;
    if (
      ![
        "Rain_Manila_mm",
        "Rain_Marikina_mm",
        "Rain_Pasig_mm",
        "Rain_QuezonCity_mm",
      ].includes(column)
    ) {
      return NextResponse.json(
        { error: `No monthly rainfall series is available for ${location}.` },
        { status: 404 },
      );
    }
    const rows = parseCsv(
      await readFile(/* turbopackIgnore: true */ monthlyPath, "utf8"),
    );
    const [header, ...body] = rows;
    const monthly = body
      .map(
        (cells) =>
          Object.fromEntries(
            header.map((name, position) => [name, cells[position] ?? ""]),
          ) as unknown as MonthlyRow,
      )
      .filter((row) => row[column] !== undefined)
      .slice(-24)
      .map((row) => ({ month: row.Month, rainfall: Number(row[column]) }));
    return NextResponse.json({
      dataset: "RiverGuard NCR Dataset v2",
      location,
      readings: monthly,
    });
  }

  const rows = parseCsv(
    await readFile(/* turbopackIgnore: true */ datasetPath, "utf8"),
  );
  const [header, ...body] = rows;
  const filtered = body
    .map((cells) => {
      const row = Object.fromEntries(
        header.map((name, position) => [name, cells[position] ?? ""]),
      ) as unknown as HistoricalRow;
      return row;
    })
    .filter((row) => row.Location === location)
    .filter((row) => (!start || row.Date >= start) && (!end || row.Date <= end))
    .sort((left, right) => left.Date.localeCompare(right.Date))
    .slice(-limit);

  if (filtered.length === 0) {
    return NextResponse.json(
      { error: `No historical records are available for ${location}.` },
      { status: 404 },
    );
  }

  return NextResponse.json({
    dataset: "RiverGuard NCR Dataset v2",
    location,
    dateMin: filtered[0].Date,
    dateMax: filtered[filtered.length - 1].Date,
    readings: filtered.map((row) => ({
      isoDate: row.Date,
      date: new Intl.DateTimeFormat("en-US", {
        month: "short",
        day: "numeric",
        timeZone: "Asia/Manila",
      }).format(new Date(`${row.Date}T00:00:00+08:00`)),
      rainfall: parseMeasurement(row.Rainfall_mm),
      waterLevel: parseMeasurement(row.WaterLevel_m),
      rainSource: row.RainSource,
      qualityStatus: row.QualityStatus,
    })),
  });
}
