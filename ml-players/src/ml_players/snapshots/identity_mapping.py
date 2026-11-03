from __future__ import annotations


class ExternalPlayerMapping:
    def __init__(self, proveedor: str, id_externo: str, id_interno: str, verificado: bool = False) -> None:
        self.proveedor = proveedor
        self.id_externo = id_externo
        self.id_interno = id_interno
        self.verificado = verificado


def map_snapshot_player(snapshot: dict[str, object], mappings: dict[tuple[str, str], ExternalPlayerMapping]) -> dict[str, object] | None:
    key = (str(snapshot["proveedor"]), str(snapshot["idJugadorExterno"]))
    mapping = mappings.get(key)
    if mapping is None or not mapping.verificado:
        return None
    return {**snapshot, "idJugador": mapping.id_interno}
