'use strict';

// Backward-compat entrypoint. Queue-based scheduler now lives in src/jobs.
const { bootstrap } = require('../src/jobs/scheduler');

bootstrap().catch((err) => {
	// Keep stderr output for process manager visibility
	// eslint-disable-next-line no-console
	console.error('Scheduler bootstrap failed:', err.message);
	process.exit(1);
});
