from ml_players.training.evaluation import evaluate_statistics, temporal_split
from ml_players.training.normalization import normalize_prediction


def test_metrics_are_available_and_predictions_are_non_negative():
    actual = [{name: 1.0 for name in ("goles", "asistencias", "tiros", "pasesClave", "regates", "faltasCometidas", "rating")}]
    predicted = [{**actual[0], "goles": -1}]
    assert evaluate_statistics(actual, predicted, "whoscored")["origenDatos"] == "whoscored"
    assert normalize_prediction(predicted[0])["goles"] == "0"


def test_split_is_temporal():
    train, validation, test = temporal_split([{"t": "2025-03-01"}, {"t": "2025-01-01"}, {"t": "2025-02-01"}, {"t": "2025-04-01"}, {"t": "2025-05-01"}])
    assert train[0]["t"] == "2025-01-01"
    assert validation[0]["t"] == "2025-04-01"
    assert test[0]["t"] == "2025-05-01"
