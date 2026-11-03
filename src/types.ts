export enum ModuleStatus {
  WORKING = 'WORKING',
  WAITING = 'WAITING',
  ERROR = 'ERROR',
  DISABLED = 'DISABLED'
}

export type SeverityLevel = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';

export interface IModuleIssue {
  id: string;
  moduleNumber: number;
  message: string;
  filePath?: string;
  lineNumber?: number;
  severity: SeverityLevel;
  remediation?: string;
}

export interface IModuleScanResult {
  moduleNumber: number;
  moduleName: string;
  status: ModuleStatus;
  lastChecked: Date;
  issues: IModuleIssue[];
  metrics?: Record<string, string | number | boolean | string[]>;
  degradationNote?: string;
}

export interface IModuleDefinition {
  readonly number: number;
  readonly name: string;
  readonly category: string;
  executeScan(workspaceRoot?: string): Promise<IModuleScanResult>;
  quickFix?(issueId: string): Promise<boolean>;
}

export interface IRuleItem {
  id: string;
  name: string;
  category: string;
  severity: SeverityLevel;
  description: string;
  pattern: string;
  recommendation: string;
  enabled?: boolean;
}

export interface IReleaseGateReport {
  timestamp: string;
  totalModules: number;
  passedCount: number;
  warningCount: number;
  blockerCount: number;
  isLocked: boolean;
  blockers: IModuleIssue[];
  warnings: IModuleIssue[];
  summaryText: string;
}

export interface IProjectMemory {
  projectType: string;
  techStack: string[];
  routes: string[];
  models: string[];
  databaseTables: string[];
  businessRules: string[];
  knownIssues: string[];
  completedFeatures: string[];
  lastUpdated: string;
}
