#!/usr/bin/env node
import type { AstuteConfig } from '@astuteimaging/astute-core';

const config: AstuteConfig = { version: '0.1.0' };

if (process.argv.includes('--version')) {
  console.log(config.version);
  process.exit(0);
}
