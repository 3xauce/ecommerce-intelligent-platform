"""Tests hors-ligne du modèle de prédiction."""

import sys
from datetime import date, timedelta
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from model import predict_sales, trend_score  # noqa: E402


def make_history(units_per_day):
    """Construit un historique jour par jour à partir d'une liste d'unités."""
    origin = date(2026, 6, 1)
    return [
        {"day": (origin + timedelta(days=i)).isoformat(), "units": u}
        for i, u in enumerate(units_per_day)
    ]


class TestPredictSales:
    def test_historique_vide(self):
        results = predict_sales([])
        assert len(results) == 3
        assert all(r["predicted_units"] == 0.0 for r in results)
        assert all(r["confidence"] == 0.0 for r in results)

    def test_peu_de_points_extrapole_la_moyenne(self):
        history = make_history([2, 4])  # moyenne 3/jour
        results = predict_sales(history, periods=[30])
        assert results[0]["predicted_units"] == 90.0
        assert results[0]["confidence"] == 0.3

    def test_tendance_croissante_reguliere(self):
        # 1, 2, 3, ... 14 unités/jour : régression quasi parfaite
        history = make_history(list(range(1, 15)))
        results = predict_sales(history, periods=[30, 60, 90])

        assert [r["period_days"] for r in results] == [30, 60, 90]
        # La tendance monte : les prévisions doivent croître avec l'horizon
        assert results[0]["predicted_units"] < results[1]["predicted_units"]
        assert results[1]["predicted_units"] < results[2]["predicted_units"]
        # R² élevé sur une droite parfaite
        assert results[0]["confidence"] >= 0.7

    def test_tendance_decroissante_ne_predit_jamais_negatif(self):
        history = make_history([20, 17, 14, 11, 8, 5, 2])
        results = predict_sales(history, periods=[90])
        assert results[0]["predicted_units"] >= 0.0

    def test_periodes_personnalisees(self):
        history = make_history([5] * 10)
        results = predict_sales(history, periods=[7])
        assert results[0]["period_days"] == 7


class TestTrendScore:
    def test_serie_croissante(self):
        result = trend_score(make_history([1, 2, 4, 6, 9, 12]))
        assert result["trend"] == "hausse"
        assert result["slope_pct_per_day"] > 2.0

    def test_serie_decroissante(self):
        result = trend_score(make_history([12, 9, 6, 4, 2, 1]))
        assert result["trend"] == "baisse"

    def test_serie_stable(self):
        result = trend_score(make_history([5, 5, 5, 5, 5]))
        assert result["trend"] == "stable"

    def test_serie_trop_courte(self):
        result = trend_score(make_history([3]))
        assert result["trend"] == "stable"
        assert result["slope_pct_per_day"] == 0.0
