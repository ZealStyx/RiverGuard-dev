# RiverGuard ML service

Local FastAPI inference for the RiverGuard test model. Runs on the developer's machine only; the
Next route handler `apps/web/src/app/api/forecast` is the only caller.

```bash
python3 -m pip install -e ".[dev]"
uvicorn app.main:app --reload --port 8000     # http://127.0.0.1:8000/docs
python3 -m pytest -q                          # 24 tests
```

| Endpoint | Purpose |
|---|---|
| `GET /health` | Liveness, model path, whether the artifact exists |
| `GET /health/ready` | Loads the model; returns version, operating threshold, test metrics, warning |
| `GET /v1/cities` | Supported locations with alarm levels and their provenance |
| `POST /v1/forecast/daily` | 1..14 days, chained through antecedent rain and soil moisture |
| `POST /v1/forecast/next-day` | One day plus a sensitivity ranking |
| `POST /v1/risk/assess` | One day's risk level, alarm crossing, and reasons |

The model is `ml/artifacts/model.json` — flat-array gradient-boosted trees exported by
`ml/train_test_model.py`. No scikit-learn at runtime; the same arrays run in `ml/predictor.html`, and
`tests/test_risk_classification.py` pins four golden values that both paths must reproduce exactly.

**Test model, not a forecaster.** Water level and flood labels in dataset v2 are derived from
rainfall, so metrics measure recovery of the generator. See `docs/ml-methodology.md` §2.
