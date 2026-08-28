/**
 * MONOLITH Digital Shadow Service — Main Entry Point
 * Bootstraps all services and starts the HTTP health server
 *
 * Architecture:
 * ┌─────────────────────────────────────────────────────────────┐
 * │  Digital Shadow Service                                      │
 * │  ┌──────────────┐  ┌────────────────┐  ┌────────────────┐  │
 * │  │ OPC UA Client │  │ MQTT Ingestion │  │ State Recon.   │  │
 * │  │ Service       │  │ Service        │  │ Engine         │  │
 * │  └──────┬───────┘  └───────┬────────┘  └───────┬────────┘  │
 * │         │                   │                    │           │
 * │  ┌──────┴───────────────────┴────────────────────┴────────┐ │
 * │  │              Redis Streams (Event Bus)                   │ │
 * │  └──────┬───────────────────┬────────────────────┬────────┘ │
 * │         │                   │                    │           │
 * │  ┌──────┴───────┐  ┌───────┴────────┐  ┌───────┴────────┐  │
 * │  │ CAS Bridge   │  │ Activity Log   │  │ Sensor Batch   │  │
 * │  │              │  │ Bridge         │  │ Signer         │  │
 * │  └──────────────┘  └────────────────┘  └────────────────┘  │
 * └─────────────────────────────────────────────────────────────┘
 */

import { serve } from '@hono/node-server';
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import pino from 'pino';

import { serverConfig, buildMachineEndpoints } from './config';
import { RULPredictionService } from './services/RULPredictionService';
import { ComponentType } from './types/maintenance';
import {
  OpcuaClientService,
  MqttIngestionService,
  StateReconciliationEngine,
  CASBridge,
  ActivityLogBridge,
  SensorBatchSigner,
} from './services';

// ─── Logger ──────────────────────────────────────────────────────────────────

const logger = pino({
  name: 'digital-shadow-main',
  level: serverConfig.logLevel,
  transport: serverConfig.isDev
    ? { target: 'pino-pretty', options: { colorize: true } }
    : undefined,
});

// ─── Service Instances ───────────────────────────────────────────────────────

const machineEndpoints = buildMachineEndpoints();
const opcuaService = new OpcuaClientService(machineEndpoints);
const mqttService = new MqttIngestionService();
const stateEngine = new StateReconciliationEngine();
const casBridge = new CASBridge();
const activityLog = new ActivityLogBridge();
const batchSigner = new SensorBatchSigner();
const rulService = new RULPredictionService({ logger });

// ─── HTTP Health API (Hono) ──────────────────────────────────────────────────

const app = new Hono();
app.use('*', cors());

app.get('/health', (c) => {
  const health = {
    service: 'monolith-digital-shadow',
    version: '0.1.0',
    status: 'running',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    components: {
      opcua: opcuaService.getHealth(),
      mqtt: mqttService.getHealth(),
    },
  };
  return c.json(health);
});

app.get('/machines', async (c) => {
  const states = await opcuaService.readAllStates();
  const machines = [...states.entries()].map(([id, state]) => ({
    ...state,
    machineId: id,
  }));
  return c.json({ machines });
});

app.get('/machines/:id', async (c) => {
  const machineId = c.req.param('id');
  const adapter = opcuaService.getAdapter(machineId);
  if (!adapter) {
    return c.json({ error: 'Machine not found' }, 404);
  }

  try {
    const state = await adapter.readState();
    return c.json(state);
  } catch (err) {
    return c.json({ error: 'Failed to read machine state' }, 500);
  }
});

app.get('/machines/:id/telemetry', async (c) => {
  const machineId = c.req.param('id');
  const adapter = opcuaService.getAdapter(machineId);
  if (!adapter) {
    return c.json({ error: 'Machine not found' }, 404);
  }

  try {
    const telemetry = await adapter.readTelemetry();
    return c.json({ machineId, telemetry });
  } catch (err) {
    return c.json({ error: 'Failed to read telemetry' }, 500);
  }
});


// ─── Predictive Maintenance / RUL Endpoint ───────────────────────────────────

app.get('/machines/:id/maintenance', async (c) => {
  const machineId = c.req.param('id');
  const adapter = opcuaService.getAdapter(machineId);
  if (!adapter) {
    return c.json({ error: 'Machine not found' }, 404);
  }

  try {
    // Operating hours from query param or derive from part count × average cycle time
    const operatingHoursParam = c.req.query('operatingHours');
    const operatingHours = operatingHoursParam
      ? parseFloat(operatingHoursParam)
      : 2500; // default: mid-life CNC

    const components = Object.values(ComponentType);
    const results = components.map((componentType) => {
      // Minimal degradation indicators — in production these come from
      // FeatureEngineeringService via the Redis event bus
      const degradationIndicators = [
        {
          name: 'rms_vibration',
          currentValue: 0.12 + Math.random() * 0.08,
          warningThreshold: 0.18,
          failureThreshold: 0.30,
          normalizedDeviation: 0.15,
        },
        {
          name: 'kurtosis',
          currentValue: 3.1 + Math.random() * 0.8,
          warningThreshold: 4.5,
          failureThreshold: 7.0,
          normalizedDeviation: 0.10,
        },
      ];

      const rul = rulService.predictRUL(
        machineId,
        componentType,
        operatingHours,
        degradationIndicators,
      );

      const health = rulService.assessComponentHealth(
        machineId,
        componentType,
        rul,
        0.05, // anomalyScore — low baseline
        degradationIndicators,
      );

      return {
        componentType,
        healthScore: health.healthScore,
        status: health.status,
        remainingUsefulLife: rul.median,
        confidence: rul.confidence,
        rul,
        contributingFactors: health.contributingFactors,
      };
    });

    const criticalCount = results.filter(
      (r) => r.status === 'CRITICAL' || r.status === 'FAILED',
    ).length;
    const warningCount = results.filter((r) => r.status === 'WARNING').length;

    const overallScore =
      results.reduce((sum, r) => sum + r.healthScore, 0) / results.length;
    const overallHealth =
      criticalCount > 0
        ? 'CRITICAL'
        : warningCount > 0
          ? 'WARNING'
          : overallScore > 0.8
            ? 'HEALTHY'
            : 'DEGRADING';

    return c.json({
      machineId,
      assessedAt: new Date().toISOString(),
      operatingHours,
      components: results,
      overallHealth,
      criticalCount,
      warningCount,
    });
  } catch (err) {
    logger.error({ err, machineId }, 'Failed to assess maintenance');
    return c.json({ error: 'Maintenance assessment failed' }, 500);
  }
});

// ─── Bootstrap ───────────────────────────────────────────────────────────────

async function bootstrap(): Promise<void> {
  logger.info('═══════════════════════════════════════════════════════════════');
  logger.info('  MONOLITH Digital Shadow Service v0.1.0');
  logger.info('  DAPH Decor — Manufacturing Intelligence Platform');
  logger.info('═══════════════════════════════════════════════════════════════');
  logger.info({ machineCount: machineEndpoints.length, port: serverConfig.port });

  try {
    // 1. Initialize signing keys
    await batchSigner.initialize();
    logger.info('✓ Sensor Batch Signer initialized');

    // 2. Start State Reconciliation Engine (creates Redis streams)
    await stateEngine.start();
    logger.info('✓ State Reconciliation Engine started');

    // 3. Start Activity Log Bridge
    activityLog.start();
    logger.info('✓ Activity Log Bridge started');

    // 4. Start MQTT Ingestion Service
    await mqttService.start();
    logger.info('✓ MQTT Ingestion Service started');

    // 5. Start OPC UA Client Service (connects to machines)
    await opcuaService.start();
    logger.info('✓ OPC UA Client Service started');

    // 6. Wire up state change pipeline
    wireEventPipeline();
    logger.info('✓ Event pipeline wired');

    // 7. Start HTTP server
    serve({ fetch: app.fetch, port: serverConfig.port });
    logger.info(`✓ Health API listening on http://0.0.0.0:${serverConfig.port}`);

    logger.info('═══════════════════════════════════════════════════════════════');
    logger.info('  Digital Shadow Service is READY');
    logger.info('═══════════════════════════════════════════════════════════════');

    // Log startup to activity log
    activityLog.logSystemEvent('service_started', {
      version: '0.1.0',
      machines: machineEndpoints.map((e) => e.machineId),
    });
  } catch (err) {
    logger.fatal({ err }, 'Failed to bootstrap Digital Shadow Service');
    process.exit(1);
  }
}

// ─── Event Pipeline Wiring ───────────────────────────────────────────────────

function wireEventPipeline(): void {
  // Connect adapter state changes → State Reconciliation → CAS + Activity Log
  for (const adapter of opcuaService.getAllAdapters()) {
    adapter.onStateChange(async (machineId, _prev, _next, _timestamp) => {
      // Get full snapshot
      const snapshot = opcuaService.getCachedState(machineId);
      if (!snapshot) return;

      // Process through state reconciliation
      await stateEngine.processStateUpdate(snapshot);

      // Store in CAS
      const hash = await casBridge.storeStateSnapshot(snapshot);

      // Log activity
      activityLog.logStateSnapshot(snapshot, hash);
    });

    adapter.onTelemetry(async (points) => {
      if (points.length === 0) return;
      const machineId = points[0]!.machineId;

      // Create signed batch
      const batch = await batchSigner.createSignedBatch(machineId, points);

      // Store in CAS
      await casBridge.storeSensorBatch(batch);

      // Also publish via MQTT for other consumers
      await mqttService.publishBatch(batch);
    });
  }
}

// ─── Graceful Shutdown ───────────────────────────────────────────────────────

async function shutdown(signal: string): Promise<void> {
  logger.info({ signal }, 'Shutdown signal received');

  activityLog.logSystemEvent('service_stopping', { signal });

  await opcuaService.stop();
  await mqttService.stop();
  await stateEngine.stop();
  await activityLog.stop();

  logger.info('Digital Shadow Service stopped gracefully');
  process.exit(0);
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

// ─── Start ───────────────────────────────────────────────────────────────────

bootstrap();
