import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';

const output = execFileSync(process.execPath, ['scripts/capacity-plan.mjs'], { encoding: 'utf8' });
const plan = JSON.parse(output);

assert.ok(plan.computeNodes >= 2);
assert.ok(plan.objectStorageGb >= 1);
assert.ok(plan.monthlyEstimate > 0);
assert.equal(plan.currency, 'EUR');
assert.equal(plan.thresholds.cpuPercent, 65);
console.log('capacity model test passed');
