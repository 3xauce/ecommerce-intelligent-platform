"""
Modèles de prédiction (scikit-learn) — fonctions pures, testables hors-ligne.

Les historiques de ventes arrivent sous forme de listes
[{"day": "YYYY-MM-DD", "units": int}], envoyées par le backend Node.
"""

from datetime import date

import numpy as np
from sklearn.linear_model import LinearRegression

MIN_POINTS_FOR_REGRESSION = 5


def _to_series(history):
    """Convertit l'historique en (jours depuis le début, unités/jour)."""
    if not history:
        return np.array([]), np.array([])

    parsed = sorted(
        (date.fromisoformat(row["day"]), float(row["units"])) for row in history
    )
    origin = parsed[0][0]
    x = np.array([(d - origin).days for d, _ in parsed], dtype=float)
    y = np.array([units for _, units in parsed], dtype=float)
    return x, y


def predict_sales(history, periods=(30, 60, 90)):
    """
    Prévision du volume de ventes pour chaque horizon (en unités).

    - >= 5 points : régression linéaire sur les ventes journalières,
      confiance dérivée du R² (bornée [0.2, 0.95]) pondérée par la
      quantité de données disponible.
    - < 5 points : extrapolation de la moyenne journalière, confiance faible.
    """
    x, y = _to_series(history)

    if len(x) == 0:
        return [
            {"period_days": p, "predicted_units": 0.0, "confidence": 0.0}
            for p in periods
        ]

    if len(x) < MIN_POINTS_FOR_REGRESSION:
        daily_avg = float(np.mean(y))
        return [
            {
                "period_days": p,
                "predicted_units": round(max(0.0, daily_avg * p), 1),
                "confidence": 0.3,
            }
            for p in periods
        ]

    model = LinearRegression()
    X = x.reshape(-1, 1)
    model.fit(X, y)
    r2 = model.score(X, y)

    # Le R² d'une série bruitée peut être négatif : on le borne, puis on le
    # pondère par la couverture temporelle (plus d'historique = plus fiable).
    data_factor = min(1.0, len(x) / 30.0)
    confidence = round(max(0.2, min(0.95, max(0.0, r2) * 0.7 + data_factor * 0.3)), 2)

    last_day = float(x[-1])
    results = []
    for p in periods:
        future_days = np.arange(last_day + 1, last_day + 1 + p).reshape(-1, 1)
        daily_forecast = np.clip(model.predict(future_days), 0.0, None)
        results.append(
            {
                "period_days": p,
                "predicted_units": round(float(np.sum(daily_forecast)), 1),
                "confidence": confidence,
            }
        )
    return results


def trend_score(history):
    """
    Pente relative de la série (%/jour rapporté à la moyenne), pour détecter
    les tendances émergentes. Classification : hausse / stable / baisse.
    """
    x, y = _to_series(history)

    if len(x) < 3 or float(np.mean(y)) == 0.0:
        return {"slope_pct_per_day": 0.0, "trend": "stable"}

    model = LinearRegression()
    model.fit(x.reshape(-1, 1), y)
    slope_pct = float(model.coef_[0]) / float(np.mean(y)) * 100.0

    if slope_pct > 2.0:
        trend = "hausse"
    elif slope_pct < -2.0:
        trend = "baisse"
    else:
        trend = "stable"

    return {"slope_pct_per_day": round(slope_pct, 2), "trend": trend}
