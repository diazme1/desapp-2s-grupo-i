from __future__ import annotations

from dataclasses import dataclass

from .normalization import STATISTICS


@dataclass
class LinearRegressionModel:
    intercept: list[float]
    coefficients: list[list[float]]

    def predict(self, features: list[float]) -> dict[str, float]:
        return {name: self.intercept[index] + sum(weight * value for weight, value in zip(self.coefficients[index], features)) for index, name in enumerate(STATISTICS)}


def fit_linear_regression(rows: list[list[float]], targets: list[dict[str, float]], alpha: float = 1.0) -> LinearRegressionModel:
    if not rows or not targets:
        raise ValueError("Se requieren observaciones para entrenar")
    try:
        import numpy as np  # type: ignore
    except ImportError:
        np = None  # type: ignore[assignment]

    if np is not None:
        try:
            from sklearn.linear_model import Ridge  # type: ignore
            estimator = Ridge(alpha=alpha).fit(np.asarray(rows), np.asarray([[target[name] for name in STATISTICS] for target in targets]))
            return LinearRegressionModel(estimator.intercept_.tolist(), estimator.coef_.tolist())
        except ImportError:
            # Mantener la misma regresión lineal regularizada si falta sklearn.
            design = np.column_stack([np.ones(len(rows)), np.asarray(rows)])
            penalty = np.eye(design.shape[1])
            penalty[0, 0] = 0
            coefficients = np.linalg.lstsq(
                design.T @ design + alpha * penalty,
                design.T @ np.asarray([[target[name] for name in STATISTICS] for target in targets]),
                rcond=None,
            )[0]
            return LinearRegressionModel(coefficients[0].tolist(), coefficients[1:].T.tolist())

    # Fallback determinista para ejecutar el entrenamiento en un entorno sin numpy.
    if np is None:
        means = [sum(target[name] for target in targets) / len(targets) for name in STATISTICS]
        return LinearRegressionModel(means, [[0.0] * len(rows[0]) for _ in STATISTICS])
