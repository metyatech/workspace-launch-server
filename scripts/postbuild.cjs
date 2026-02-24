const fs = require('fs');
const path = require('path');

const launcherPath = path.resolve(__dirname, '../dist/workspace-launch-server');
const launcherContent = `#!/usr/bin/env node
import './server.js';
`;

fs.writeFileSync(launcherPath, launcherContent);
try {
  fs.chmodSync(launcherPath, 0o755);
} catch (error) {
  // On Windows chmod may fail; ignore silently.
}
