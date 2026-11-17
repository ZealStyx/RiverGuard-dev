/**
 * GET /api/model
 *
 * The deployed model's identity, held-out test metrics, and caveats, read from
 * `ml/artifacts/{model,metrics}.json`. Feeds the admin model and run-history
 * screens, which previously displayed a hard-coded "RG-NCR v0.4".
 */

import { NextResponse } from "next/server";

import { loadModelArtifacts } from "@/lib/ml-artifacts";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const artifacts = await loadModelArtifacts();
    if (!artifacts) {
      return NextResponse.json(
        {
          error:
            "No model artifacts found. Train the model to write ml/artifacts/model.json and metrics.json.",
        },
        { status: 503 },
      );
    }
    return NextResponse.json(artifacts);
  } catch (error) {
    return NextResponse.json(
      {
        error: "The model artifacts could not be read.",
        detail: error instanceof Error ? error.message : "unknown error",
      },
      { status: 500 },
    );
  }
}
