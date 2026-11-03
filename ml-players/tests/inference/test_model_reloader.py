from pathlib import Path

from ml_players.inference.model_loader import load_model
from ml_players.inference.model_reloader import ModelManager, ModelReloader


def test_reload_success_swaps_atomically_and_failure_keeps_previous(tmp_path):
    fixture = Path(__file__).parents[1] / "fixtures" / "model-fixture"
    old = load_model(fixture / "model.joblib", fixture / "manifest.json")
    manager = ModelManager(old)
    new_manifest = tmp_path / "manifest.json"
    new_manifest.write_text((fixture / "manifest.json").read_text().replace("fixture-model-1", "fixture-model-2"))
    pointer = {"versionModelo": "fixture-model-2", "artifactPath": str(fixture / "model.joblib"), "manifestPath": str(new_manifest)}
    reloader = ModelReloader(manager, lambda: pointer)
    assert reloader.check_once() is True
    assert manager.snapshot().version_modelo == "fixture-model-2"
    pointer["versionModelo"] = "broken"
    pointer["artifactPath"] = str(fixture / "missing.joblib")
    assert reloader.check_once() is False
    assert manager.snapshot().version_modelo == old.version_modelo
