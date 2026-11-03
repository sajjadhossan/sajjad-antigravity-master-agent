import * as vscode from 'vscode';
import { IModuleDefinition, IModuleScanResult, ModuleStatus } from '../types';
import { createAllModules } from '../modules';

export class ModuleRegistry {
  private static instance: ModuleRegistry;
  private modules: Map<number, IModuleDefinition> = new Map();
  private latestResults: Map<number, IModuleScanResult> = new Map();
  private disabledModules: Set<number> = new Set();
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
      // Pre-seed initial results so the UI is immediately populated with all 50 modules
      this.latestResults.set(mod.number, {
        moduleNumber: mod.number,
        moduleName: mod.name,
        status: ModuleStatus.WORKING,
        enabled: true,
        lastChecked: new Date(),
        issues: [],
        metrics: { initialized: true },
      });
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

  public isModuleEnabled(number: number): boolean {
    return !this.disabledModules.has(number);
  }

  public async toggleModule(number: number): Promise<boolean> {
    const mod = this.modules.get(number);
    if (!mod) {
      return false;
    }

    if (this.disabledModules.has(number)) {
      this.disabledModules.delete(number);
      await this.scanSingleModule(number);
      return true; // Now enabled
    } else {
      this.disabledModules.add(number);
      this.latestResults.set(number, {
        moduleNumber: mod.number,
        moduleName: mod.name,
        status: ModuleStatus.DISABLED,
        enabled: false,
        lastChecked: new Date(),
        issues: [],
        degradationNote: 'Disabled by user toggle switch.',
      });
      return false; // Now disabled
    }
  }

  public async scanSingleModule(number: number): Promise<IModuleScanResult | undefined> {
    const mod = this.modules.get(number);
    if (!mod) {
      return undefined;
    }

    if (this.disabledModules.has(number)) {
      const res: IModuleScanResult = {
        moduleNumber: mod.number,
        moduleName: mod.name,
        status: ModuleStatus.DISABLED,
        enabled: false,
        lastChecked: new Date(),
        issues: [],
        degradationNote: 'Module is currently toggled OFF.',
      };
      this.latestResults.set(number, res);
      return res;
    }

    const workspaceFolders = vscode.workspace.workspaceFolders;
    const rootPath = workspaceFolders && workspaceFolders.length > 0 ? workspaceFolders[0].uri.fsPath : undefined;

    try {
      const res = await mod.executeScan(rootPath);
      res.enabled = true;
      this.latestResults.set(number, res);
      return res;
    } catch (err: any) {
      const fallbackResult: IModuleScanResult = {
        moduleNumber: mod.number,
        moduleName: mod.name,
        status: ModuleStatus.ERROR,
        enabled: true,
        lastChecked: new Date(),
        issues: [
          {
            id: `MOD-ERR-${mod.number}`,
            moduleNumber: mod.number,
            message: `Scan failed: ${err.message || String(err)}`,
            severity: 'HIGH',
          },
        ],
      };
      this.latestResults.set(number, fallbackResult);
      return fallbackResult;
    }
  }

  public async runFullScan(): Promise<IModuleScanResult[]> {
    if (this.isScanning) {
      return this.getAllResults();
    }
    this.isScanning = true;

    try {
      const promises = Array.from(this.modules.keys()).map((num) => this.scanSingleModule(num));
      await Promise.all(promises);
      return this.getAllResults();
    } finally {
      this.isScanning = false;
    }
  }
}
