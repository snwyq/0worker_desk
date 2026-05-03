export interface ITool<I, O> {
  metadata: {
    id: string;
    version: string;
    description: string;
  };
  execute(params: I, context: WorkflowContext): Promise<O>;
}

export interface BaseWorkflowNode {
  id: string;
  type: string;
}

export interface LlmNode extends BaseWorkflowNode {
  type: 'llm';
  prompt: string;
  inputKey: string;
  outputKey: string;
  retryOnFailure?: boolean;
  fallbackModel?: string;
}

export interface SearchNode extends BaseWorkflowNode {
  type: 'search';
  query: string;
  outputKey: string;
}

export interface ImageSearchNode extends BaseWorkflowNode {
  type: 'image_search';
  count: number;
  outputKey: string;
}

export interface ImageGenNode extends BaseWorkflowNode {
  type: 'image_gen';
  prompt: string;
  model: string;
  outputKey: string;
}

export interface AssetManagerNode extends BaseWorkflowNode {
  type: 'asset_manager';
  sourceKeys: string[];
  action: 'download' | 'compress';
}

export interface SafetyCheckNode extends BaseWorkflowNode {
  type: 'safety_check';
  contentKey: string;
  action: 'block' | 'flag';
}

export interface PersistNode extends BaseWorkflowNode {
  type: 'persist';
  dataKey: string;
  table: string;
  checkExists?: boolean;
}

export interface BatchLoopNode extends BaseWorkflowNode {
  type: 'batch_loop';
  sourceKey: string;
  subPipeline: WorkflowNode[];
}

export interface BaziNode extends BaseWorkflowNode {
  type: 'bazi_calc';
  birthDateKey: string;
  birthTimeKey?: string;
  genderKey?: string;
  outputKey: string;
}

export interface TopHubNode extends BaseWorkflowNode {
  type: 'tophub_search';
  nodeId?: string;
  outputKey: string;
}

export interface DistributeNode extends BaseWorkflowNode {
  type: 'distribute';
  contentKey: string;
  mediaKey?: string;
  strategy: 'manual' | 'auto' | 'smart';
}

export type WorkflowNode = 
  | LlmNode
  | SearchNode
  | ImageSearchNode
  | ImageGenNode
  | AssetManagerNode
  | SafetyCheckNode
  | PersistNode
  | BatchLoopNode
  | BaziNode
  | TopHubNode
  | DistributeNode;

export interface WorkflowDefinition {
  pluginCode: string;
  workflowId: string;
  trigger: string;
  frequency?: string;
  steps: WorkflowNode[];
  settingsSchema?: Record<string, unknown>;
}

export interface WorkflowContext {
  runId: string;
  workflowId: string;
  accountId: number | null;
  state: Record<string, any>;
  logs: any[];
  config: Record<string, any>; // Account specific overrides
  onLog?: (log: any) => void;
}
