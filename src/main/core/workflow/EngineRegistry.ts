import type { AppDatabase } from '../../db/database.js';
import { BaziTool } from '../tools/BaziTool.js';
import { LlmTool } from '../tools/LlmTool.js';
import { PersistTool } from '../tools/PersistTool.js';
import { SearchTool } from '../tools/SearchTool.js';
import { TopHubTool } from '../tools/TopHubTool.js';
import { ImageGenTool } from '../tools/ImageGenTool.js';
import { WorkflowRunner } from './WorkflowRunner.js';
import { WorkflowScheduler } from './WorkflowScheduler.js';

let sharedRunner: WorkflowRunner | null = null;
let sharedScheduler: WorkflowScheduler | null = null;

export function initializeWorkflowEngine(db: AppDatabase): WorkflowRunner {
  if (sharedRunner) return sharedRunner;

  const runner = new WorkflowRunner(db);
  
  // Register Core Tools
  runner.registerTool('llm', new LlmTool());
  runner.registerTool('search', new SearchTool());
  runner.registerTool('tophub_search', new TopHubTool());
  runner.registerTool('persist', new PersistTool(db));
  
  // Register Client Specific Tools
  runner.registerTool('bazi_calc', new BaziTool());
  runner.registerTool('image_gen', new ImageGenTool());

  sharedRunner = runner;
  
  // Initialize Scheduler
  sharedScheduler = new WorkflowScheduler(db, runner);
  sharedScheduler.start();

  return runner;
}

export function getWorkflowEngine(): WorkflowRunner {
  if (!sharedRunner) {
    throw new Error('WorkflowEngine not initialized. Call initializeWorkflowEngine(db) first.');
  }
  return sharedRunner;
}

export function getWorkflowScheduler(): WorkflowScheduler {
  if (!sharedScheduler) {
    throw new Error('WorkflowScheduler not initialized.');
  }
  return sharedScheduler;
}
