// Lightweight standalone mock of VS Code API for unit testing outside extension host
export const workspace = {
  getConfiguration: () => ({
    get: (key: string, defaultVal: any) => defaultVal,
  }),
  workspaceFolders: [],
};

export const languages = {
  getDiagnostics: () => [],
  createDiagnosticCollection: () => ({
    set: () => {},
    clear: () => {},
    dispose: () => {},
  }),
  registerCodeActionsProvider: () => ({ dispose: () => {} }),
  registerCodeLensProvider: () => ({ dispose: () => {} }),
};

export const CodeActionKind = {
  QuickFix: 'quickfix',
  Refactor: 'refactor',
};

export class CodeAction {
  public isPreferred?: boolean;
  public diagnostics?: any[];
  public command?: any;
  public edit?: any;
  constructor(public title: string, public kind?: any) {}
}

export class CodeLens {
  constructor(public range: any, public command?: any) {}
}

export class Range {
  constructor(public startLine: number, public startCol: number, public endLine: number, public endCol: number) {}
}

export class Position {
  constructor(public line: number, public character: number) {}
}

export class WorkspaceEdit {
  insert() {}
  replace() {}
  delete() {}
}

export class EventEmitter {
  public event = () => {};
  fire() {}
}

export const Uri = {
  file: (f: string) => ({ fsPath: f }),
  joinPath: (base: any, ...segments: string[]) => ({ fsPath: `${base.fsPath || ''}/${segments.join('/')}` }),
};

export const window = {
  showWarningMessage: async () => undefined,
  showInformationMessage: async () => undefined,
  showErrorMessage: async () => undefined,
  createStatusBarItem: () => ({
    text: '',
    tooltip: '',
    show: () => {},
    dispose: () => {},
  }),
};

export const DiagnosticSeverity = {
  Error: 0,
  Warning: 1,
  Information: 2,
  Hint: 3,
};

export const StatusBarAlignment = {
  Left: 1,
  Right: 2,
};

export class ThemeColor {
  constructor(public id: string) {}
}

export class ThemeIcon {
  constructor(public id: string, public color?: any) {}
}

export class MarkdownString {
  constructor(public value: string = '') {}
}

export enum TreeItemCollapsibleState {
  None = 0,
  Collapsed = 1,
  Expanded = 2,
}

export class TreeItem {
  public id?: string;
  public iconPath?: any;
  public description?: string;
  public tooltip?: any;
  public command?: any;
  public contextValue?: string;
  constructor(public label: string, public collapsibleState: TreeItemCollapsibleState = TreeItemCollapsibleState.None) {}
}
