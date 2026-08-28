# Changelog

All notable changes to `@monolith/digital-shadow-service` will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [0.1.0] - 2026-08-28

### Added

#### Phase 1 — Digital Shadow (Unidirectional Telemetry)

- **OPC UA client** with reconnect/session-recovery logic and subscription management
- **Vendor adapters** — `BiesseAdapter`, `HomagAdapter`, `KdtAdapter` (Modbus TCP) with
  vendor-specific OPC UA node-ID maps and Modbus register maps
- **MQTT ingestion service** (`MqttIngestionService`) — QoS 1, topic-based routing,
  schema validation via Zod
- **`StateReconciliationEngine`** — 8-state WwUnitState → MonolithJobState transition
  matrix; publishes state-change events to Redis Streams (`machine:state:changes`)
- **`SensorBatchSigner`** — Ed25519 signing with SHA-256 payload hash; PEM key loading
  with lazy-init; tamper-evident audit trail for every sensor batch
- **`FeatureEngineeringService`** — extracts 15+ features per batch:
  - *Time-domain*: RMS, kurtosis, skewness, crest factor, peak-to-peak
  - *Frequency-domain*: dominant frequency, spectral entropy, band energy ratios (FFT via `fft-js`)
  - *Trend*: linear regression slope, R² (via `simple-statistics`)
- **HTTP API** (Hono, port 3000): `GET /health`, `GET /metrics`, `GET /state/:machineId`

#### Phase 2 — Command Layer (Bi-directional Write Path)

- **`CommandSafetyGate`** — 7-category safety rule matrix with configurable CRITICAL-bypass
  for emergency commands:
  | Code | Condition | Bypass |
  |------|-----------|--------|
  | `DOOR_OPEN` | Enclosure door ajar | No |
  | `E_STOP_ACTIVE` | Emergency stop engaged | No |
  | `MAINTENANCE_MODE` | Maintenance lock active | No |
  | `SPINDLE_OVERHEAT` | Spindle temp > threshold | Yes (CRITICAL) |
  | `AXIS_FAULT` | Axis controller fault | No |
  | `AIR_PRESSURE_LOW` | Pneumatic pressure low | Yes (CRITICAL) |
  | `COOLANT_LOW` | Coolant level low | Yes (CRITICAL) |
- **`CommandDispatcher`** — per-type confirmation strategies: `immediate`, `two-phase`,
  `acknowledged`; configurable timeouts and retry counts
- **Redis Streams command queue** — durable delivery via `XADD`/`XREAD`; consumer groups
  per machine; dead-letter handling after max retries
- **OPC UA write methods** per adapter (parameter update, speed/feed override, program
  selection, axis jog)
- **ADR-002** documenting full command lifecycle, Redis data model, and safety decision tree
- **REST endpoints**: `POST /command`, `GET /command/:id/status`, `DELETE /command/:id`

#### Phase 3 — Predictive Maintenance

- **`RULPredictionService`** — Weibull proportional hazards model with ISO 281 baseline
  parameters for 10 component types:
  | Component | β (shape) | η (scale, h) |
  |-----------|-----------|--------------|
  | Spindle bearing | 2.5 | 20 000 |
  | Ball screw X/Y/Z | 2.2 | 15 000 |
  | Linear guide | 1.8 | 25 000 |
  | Servo motor | 3.0 | 30 000 |
  | Coolant pump | 1.5 | 12 000 |
  | Tool holder | 2.0 | 8 000 |
  | Encoder | 2.8 | 40 000 |
  | Hydraulic unit | 1.7 | 18 000 |
  Outputs RUL in hours with 90 % confidence intervals; covariate vector derived from
  FeatureEngineering output.
- **`AnomalyDetectionService`** — Isolation Forest with deterministic Mulberry32 PRNG
  seeding; configurable contamination rate; outputs anomaly score ∈ [0, 1] and binary label
- **Full PdM pipeline**: feature extraction → anomaly detection → RUL estimation →
  threshold-based alert generation → InfluxDB write
- **REST endpoints**: `POST /predict/rul`, `POST /detect/anomaly`

#### Infrastructure & Observability

- **Docker Compose** stack: `digital-shadow-service` + InfluxDB 2 + Redis 7 +
  Eclipse Mosquitto (MQTT) + Grafana 10
- **Grafana provisioning** — pre-built dashboards: Machine State Timeline, Sensor
  Telemetry Heatmap, RUL Gauge per component, Anomaly Score Time-series
- **5-job CI pipeline** (GitHub Actions):
  `lint` → `test` → `build` → `e2e` → `load-test`
- **Vitest** test suite — 244 unit + integration tests across 15 test files;
  branches 72.6 %, functions 72.6 %, statements 37.8 %

### Dependencies (key)

| Package | Version | Purpose |
|---------|---------|---------|
| `node-opcua` | ^2.133.0 | OPC UA client/server |
| `mqtt` | ^5.10.1 | MQTT v5 client |
| `@influxdata/influxdb-client` | ^1.35.0 | Time-series storage |
| `ioredis` | ^5.4.2 | Redis Streams & pub/sub |
| `hono` | ^4.7.4 | HTTP framework |
| `modbus-serial` | ^8.0.20 | Modbus TCP for KDT |
| `@noble/ed25519` | ^2.2.3 | Ed25519 signing |
| `fft-js` | ^0.0.12 | Fast Fourier Transform |
| `simple-statistics` | ^7.8.8 | Statistical primitives |
| `zod` | ^3.24.1 | Runtime schema validation |
| `pino` | ^9.6.0 | Structured logging |

---

[0.1.0]: https://github.com/indetailsgroup-hue/monolith-workspace/compare/HEAD~1...HEAD
