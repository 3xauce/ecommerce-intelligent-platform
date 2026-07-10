"""
Microservice de prédiction (Flask + scikit-learn), appelé par le backend Node
via AI_SERVICE_URL. Lancement : python app.py (PORT configurable, 8000 par défaut).
"""

import os

from dotenv import load_dotenv
from flask import Flask, jsonify, request

from model import predict_sales, trend_score

load_dotenv()

app = Flask(__name__)


@app.get("/health")
def health():
    return jsonify({"status": "OK", "service": "ai-module"})


@app.post("/predict")
def predict():
    payload = request.get_json(silent=True) or {}
    history = payload.get("history") or []
    periods = payload.get("periods") or [30, 60, 90]

    if not isinstance(history, list):
        return jsonify({"error": "history doit être une liste"}), 400

    try:
        predictions = predict_sales(history, periods=periods)
    except (KeyError, ValueError) as exc:
        return jsonify({"error": f"Historique invalide: {exc}"}), 400

    return jsonify({"model": "linear_regression", "predictions": predictions})


@app.post("/trends")
def trends():
    payload = request.get_json(silent=True) or {}
    series = payload.get("series") or []

    if not isinstance(series, list):
        return jsonify({"error": "series doit être une liste"}), 400

    results = []
    for item in series:
        try:
            score = trend_score(item.get("history") or [])
        except (KeyError, ValueError):
            score = {"slope_pct_per_day": 0.0, "trend": "stable"}
        results.append(
            {
                "product_id": item.get("product_id"),
                "name": item.get("name"),
                **score,
            }
        )

    results.sort(key=lambda r: r["slope_pct_per_day"], reverse=True)
    return jsonify({"trends": results})


if __name__ == "__main__":
    port = int(os.environ.get("PORT", 8000))
    app.run(host="0.0.0.0", port=port)
