import fs from 'node:fs';

const modelPath = process.argv[2] ?? 'ops/capacity/model.json';
const model = JSON.parse(fs.readFileSync(modelPath, 'utf8'));
const { baseline, unitCosts, minimums } = model;

const objectStorageGb = Math.ceil(
  baseline.activeListings * baseline.averageImagesPerListing * baseline.averageImageMegabytes / 1024,
);
const computeNodes = Math.max(
  minimums.productionComputeNodes,
  Math.ceil(baseline.peakRequestsPerSecond / 100),
);
const monthlyEstimate =
  computeNodes * unitCosts.computeNodeMonthly +
  unitCosts.databaseMonthly +
  minimums.productionSearchNodes * unitCosts.searchNodeMonthly +
  minimums.productionKafkaBrokers * unitCosts.kafkaBrokerMonthly +
  unitCosts.redisMonthly +
  objectStorageGb * unitCosts.objectStorageGbMonthly;

const plan = {
  computeNodes,
  objectStorageGb,
  monthlyEstimate: Number(monthlyEstimate.toFixed(2)),
  currency: model.currency,
  thresholds: model.scalingThresholds,
};

process.stdout.write(`${JSON.stringify(plan, null, 2)}\n`);
