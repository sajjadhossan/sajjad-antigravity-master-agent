// Lightweight standalone mock of VS Code API for unit testing outside extension host
export const workspace = {
  getConfiguration: () => ({
    get: (key: string, defaultVal: any) => defaultVal,
  }),
  workspaceFolders: [],
};

export const languages = {
  getDiagnostics: () => [],
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
