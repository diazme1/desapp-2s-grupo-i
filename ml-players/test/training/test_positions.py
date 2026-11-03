from ml_players.training.positions import POSITION_FEATURES, normalize_position, position_features


def test_normalizes_common_provider_positions():
    assert normalize_position("GK") == "goalkeeper"
    assert normalize_position("D(LR),M(R)") == "defender"
    assert normalize_position("M(CLR),FW") == "forward"
    assert normalize_position("Midfielder") == "midfielder"


def test_position_is_one_hot_encoded():
    encoded = position_features("forward")
    assert set(encoded) == set(POSITION_FEATURES)
    assert encoded["position_forward"] == 1.0
    assert sum(encoded.values()) == 1.0


def test_unknown_is_the_reference_position():
    encoded = position_features("unknown")
    assert sum(encoded.values()) == 0.0
