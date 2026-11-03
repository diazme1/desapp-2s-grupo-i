from ml_players.snapshots.identity_mapping import ExternalPlayerMapping, map_snapshot_player


def test_only_verified_external_mapping_links_snapshot():
    snapshot = {"proveedor": "whoscored", "idJugadorExterno": "10"}
    assert map_snapshot_player(snapshot, {("whoscored", "10"): ExternalPlayerMapping("whoscored", "10", "local", True)})["idJugador"] == "local"
    assert map_snapshot_player(snapshot, {}) is None
