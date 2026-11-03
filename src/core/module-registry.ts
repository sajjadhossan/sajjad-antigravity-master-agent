import * as vscode from 'vscode';
import { IModuleDefinition, IModuleScanResult, ModuleStatus } from '../types';
import { createAllModules } from '../modules';

export class ModuleRegistry {
  private static instance: ModuleRegistry;
  private modules: Map<number, IModuleDefinition> = new Map();
  private latestResults: Map<number, IModuleScanResult> = new Map();
  private isScanning = false;

  private constructor() {
    this.registerDefaults();
  }

  public static getInstance(): ModuleRegistry {
    if (!ModuleRegistry.instance) {
      ModuleRegistry.instance = new ModuleRegistry();
    }
    return ModuleRegistry.instance;
  }

  private registerDefaults(): void {
    const list = createAllModules();
    for (const mod of list) {
      this.modules.set(mod.number, mod);
    }
  }

  public getAllModules(): IModuleDefinition[] {
    return Array.from(this.modules.values()).sort((a, b) => a.number - b.number);
  }

  public getModule(number: number): IModuleDefinition | undefined {
    return this.modules.get(number);
  }

  public getLatestResult(number: number): IModuleScanResult | undefined {
    return this.latestResults.get(number);
  }

  public getAllResults(): IModuleScanResult[] {
    return Array.from(this.latestResults.values()).sort((a, b) => a.moduleNumber - b.moduleNumber);
  }

  public async runFullScan(): Promise<IModuleScanResult[]> {
    if (this.isScanning) {
      return this.getAllResults();
    }
    this.isScanning = true;

    try {
      const workspaceFolders = vscode.workspace.workspaceFolders;
      const rootPath = workspaceFolders && workspaceFolders.length > 0 ? workspaceFolders[0].uri.fsPath : undefined;

      const promises = Array.from(this.modules.values()).map(async (mod) => {
        try {
          const res = await mod.executeScan(rootPath);
          this.latestResults.set(mod.number, res);
          return res;
        } catch (err: any) {
          const fallbackResult: IModuleScanResult = {
            moduleNumber: mod.number,
            moduleName: mod.name,
            status: ModuleStatus.ERROR,
            lastChecked: new Date(),
            issues: [
              {
                id: `MOD-ERR-${mod.number}`,
                moduleNumber: mod.number,
                message: `Module execution failed: ${err.message || String(err)}`,
                severity: 'HIGH',
              },
            ],
          };
          this.latestResults.set(mod.number, fallbackResult);
          return fallbackResult;
        }
      });

      await Promise.all(promises);
      return this.getAllResults();
    } finally {
      this.isScanning = false;
    }
  }
}
