import { renderTabs } from './ui/tabs.js';
import { startApp } from './services/app.js';
import { registry } from './services/registry.js';

// Register built-in tabs
import * as plan from './features/plan.js';
import * as roadmap from './features/roadmap.js';
import * as journal from './features/journal.js';

registry.register('journal', journal);
registry.register('roadmap', roadmap);
registry.register('plan', plan);

// Render shell and boot
renderTabs();
startApp();
