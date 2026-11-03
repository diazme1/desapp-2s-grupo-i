from ml_players.inference.model_reloader import ModelManager


def test_initial_state_has_no_model():
    assert ModelManager().snapshot().estado == "no_model_loaded"
