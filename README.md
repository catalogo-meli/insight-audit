# Insight Audit SdC

Dashboard local para revisar corridas de Insight Audit por fecha.

## Cargar una nueva fecha

1. Guardar el CSV en `data/` con este formato:

```text
data/insight-audit-sdc-YYYY-MM-DD.csv
```

Ejemplo:

```text
data/insight-audit-sdc-2026-05-22.csv
```

2. Regenerar los datos embebidos del dashboard:

```powershell
node scripts/refresh-data.js
```

3. Abrir `index.html`. El selector superior va a mostrar la nueva fecha junto con las anteriores y el chip `Todas`.

## Notas

- Cada CSV representa una corrida independiente.
- La app combina internamente las fechas seleccionadas.
- No hace falta unir archivos manualmente.
