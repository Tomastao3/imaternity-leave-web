const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

/**
 * Playwright global setup
 * - Ensures configData Excel files are transformed into JSON fixtures via reset-config script
 * - Exposes the generated path through CONFIG_FIXTURE_PATH for tests to consume
 */
module.exports = async () => {
  const rootDir = path.resolve(__dirname, '..');
  const generatedDir = path.join(rootDir, 'tests', 'fixtures', 'generated');
  const configJsonPath = path.join(generatedDir, 'configData.json');

  const result = spawnSync('node', ['tests/scripts/reset-config.js'], {
    cwd: rootDir,
    stdio: 'inherit'
  });

  if (result.status !== 0) {
    throw new Error('Failed to generate config fixtures before Playwright tests');
  }

  if (!fs.existsSync(configJsonPath)) {
    throw new Error(`Expected config fixture not found at ${configJsonPath}`);
  }

  process.env.CONFIG_FIXTURE_PATH = configJsonPath;
  console.log(`[global-setup] CONFIG_FIXTURE_PATH=${configJsonPath}`);

  return { configFixturePath: configJsonPath };
};
