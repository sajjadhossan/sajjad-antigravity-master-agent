import { IModuleScanResult, ModuleStatus } from '../types';
import { LocalizationService } from '../i18n/localization.service';

export function getDashboardHtml(modules: IModuleScanResult[], isLocked: boolean): string {
  const loc = LocalizationService.getInstance();
  const t = loc.t();
  const lang = loc.getLanguage();

  const total = modules.length;
  const workingCount = modules.filter(m => m.status === ModuleStatus.WORKING).length;
  const waitingCount = modules.filter(m => m.status === ModuleStatus.WAITING).length;
  const errorCount = modules.filter(m => m.status === ModuleStatus.ERROR).length;
  const disabledCount = modules.filter(m => m.status === ModuleStatus.DISABLED).length;

  const rows = modules.map(m => {
    let badgeClass = 'badge-working';
    let badgeLabel = t.workingStatus;

    if (m.status === ModuleStatus.WAITING) {
      badgeClass = 'badge-waiting';
      badgeLabel = t.waitingStatus;
    } else if (m.status === ModuleStatus.ERROR) {
      badgeClass = 'badge-error';
      badgeLabel = t.errorStatus;
    } else if (m.status === ModuleStatus.DISABLED) {
      badgeClass = 'badge-disabled';
      badgeLabel = t.disabledStatus;
    }

    const issueCount = m.issues.length;
    const checkedTime = new Date(m.lastChecked).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });

    return `
      <tr data-status="${m.status}" data-name="${m.moduleName.toLowerCase()}">
        <td><strong>#${m.moduleNumber}</strong></td>
        <td>
          <div class="module-title">${m.moduleName}</div>
          ${m.degradationNote ? `<div class="note">${m.degradationNote}</div>` : ''}
          ${m.issues.length > 0 ? `<div class="issue-pill">${m.issues[0].message}</div>` : ''}
        </td>
        <td><span class="badge ${badgeClass}">${badgeLabel}</span></td>
        <td>${checkedTime}</td>
        <td><span class="count-pill ${issueCount > 0 ? 'count-error' : 'count-ok'}">${issueCount}</span></td>
        <td>
          <button class="btn-sm" onclick="runSingleModule(${m.moduleNumber})">Scan</button>
        </td>
      </tr>
    `;
  }).join('');

  return `<!DOCTYPE html>
<html lang="${lang}">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${t.commandCenterTitle}</title>
  <style>
    :root {
      --bg-color: var(--vscode-editor-background, #1e1e1e);
      --text-color: var(--vscode-editor-foreground, #d4d4d4);
      --border-color: var(--vscode-panel-border, #333);
      --accent-color: var(--vscode-button-background, #0e639c);
      --accent-hover: var(--vscode-button-hoverBackground, #1177bb);
      --btn-text: var(--vscode-button-foreground, #ffffff);
      --badge-working: #2ea043;
      --badge-waiting: #d29922;
      --badge-error: #f85149;
      --badge-disabled: #8b949e;
    }
    body {
      background-color: var(--bg-color);
      color: var(--text-color);
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      margin: 0;
      padding: 12px;
      font-size: 13px;
    }
    .header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding-bottom: 12px;
      border-bottom: 1px solid var(--border-color);
    }
    .header h2 {
      margin: 0;
      font-size: 16px;
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .header-actions {
      display: flex;
      gap: 6px;
    }
    .btn {
      background: var(--accent-color);
      color: var(--btn-text);
      border: none;
      padding: 6px 12px;
      border-radius: 4px;
      cursor: pointer;
      font-weight: 500;
      font-size: 12px;
    }
    .btn:hover {
      background: var(--accent-hover);
    }
    .btn-verify {
      background: #238636;
      width: 100%;
      margin: 12px 0;
      padding: 10px;
      font-size: 14px;
      font-weight: 600;
    }
    .btn-verify:hover {
      background: #2ea043;
    }
    .btn-sm {
      background: rgba(255, 255, 255, 0.1);
      color: var(--text-color);
      border: 1px solid var(--border-color);
      padding: 3px 8px;
      border-radius: 3px;
      cursor: pointer;
      font-size: 11px;
    }
    .gate-banner {
      padding: 10px;
      border-radius: 4px;
      margin-bottom: 12px;
      font-weight: 600;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .gate-locked {
      background: rgba(248, 81, 73, 0.15);
      border: 1px solid var(--badge-error);
      color: #ff7b72;
    }
    .gate-passed {
      background: rgba(46, 160, 67, 0.15);
      border: 1px solid var(--badge-working);
      color: #7ee787;
    }
    .stats-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 8px;
      margin-bottom: 12px;
    }
    .stat-card {
      background: rgba(255, 255, 255, 0.04);
      border: 1px solid var(--border-color);
      border-radius: 4px;
      padding: 8px;
      text-align: center;
    }
    .stat-num {
      font-size: 18px;
      font-weight: 700;
    }
    .stat-label {
      font-size: 10px;
      color: #8b949e;
      text-transform: uppercase;
      margin-top: 2px;
    }
    .tabs-nav {
      display: flex;
      gap: 4px;
      overflow-x: auto;
      border-bottom: 1px solid var(--border-color);
      margin-bottom: 12px;
      padding-bottom: 4px;
    }
    .tab-btn {
      background: none;
      border: none;
      color: #8b949e;
      padding: 6px 10px;
      cursor: pointer;
      font-size: 12px;
      border-radius: 4px 4px 0 0;
      white-space: nowrap;
    }
    .tab-btn.active {
      color: var(--text-color);
      font-weight: 600;
      border-bottom: 2px solid var(--accent-color);
    }
    .tab-pane {
      display: none;
    }
    .tab-pane.active {
      display: block;
    }
    .filter-bar {
      display: flex;
      gap: 6px;
      margin-bottom: 10px;
      flex-wrap: wrap;
    }
    .search-input {
      flex: 1;
      min-width: 140px;
      background: rgba(255, 255, 255, 0.05);
      border: 1px solid var(--border-color);
      color: var(--text-color);
      padding: 5px 8px;
      border-radius: 4px;
      font-size: 12px;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      font-size: 12px;
    }
    th, td {
      text-align: left;
      padding: 8px 6px;
      border-bottom: 1px solid var(--border-color);
    }
    th {
      font-size: 11px;
      color: #8b949e;
      text-transform: uppercase;
    }
    .badge {
      display: inline-block;
      padding: 2px 6px;
      border-radius: 10px;
      font-size: 10px;
      font-weight: 600;
      white-space: nowrap;
    }
    .badge-working { background: rgba(46, 160, 67, 0.2); color: #7ee787; border: 1px solid rgba(46, 160, 67, 0.4); }
    .badge-waiting { background: rgba(210, 153, 34, 0.2); color: #e3b341; border: 1px solid rgba(210, 153, 34, 0.4); }
    .badge-error { background: rgba(248, 81, 73, 0.2); color: #ff7b72; border: 1px solid rgba(248, 81, 73, 0.4); }
    .badge-disabled { background: rgba(139, 148, 158, 0.2); color: #8b949e; border: 1px solid rgba(139, 148, 158, 0.4); }
    .count-pill {
      display: inline-block;
      padding: 2px 6px;
      border-radius: 8px;
      font-size: 11px;
      font-weight: 600;
    }
    .count-ok { background: rgba(46, 160, 67, 0.15); color: #7ee787; }
    .count-error { background: rgba(248, 81, 73, 0.25); color: #ff7b72; }
    .module-title { font-weight: 500; }
    .note { font-size: 10px; color: #8b949e; margin-top: 2px; }
    .issue-pill { font-size: 10px; color: #ff7b72; margin-top: 2px; }
    .card-box {
      background: rgba(255, 255, 255, 0.03);
      border: 1px solid var(--border-color);
      border-radius: 4px;
      padding: 12px;
      margin-bottom: 12px;
    }
    .card-box h3 { margin-top: 0; font-size: 14px; }
  </style>
</head>
<body>
  <div class="header">
    <h2>🛡️ Sajjad Antigravity Master <span>v8.0.0</span></h2>
    <div class="header-actions">
      <button class="btn-sm" onclick="toggleLang()">${lang === 'bn' ? 'English' : 'বাংলা'}</button>
      <button class="btn-sm" onclick="openSettings()">⚙️</button>
    </div>
  </div>

  <button class="btn btn-verify" onclick="forceVerifyAll()">${t.forceVerifyBtn}</button>

  <div class="gate-banner ${isLocked ? 'gate-locked' : 'gate-passed'}">
    <div>${isLocked ? t.releaseGateLocked : t.releaseGatePassed}</div>
    <div style="font-size: 11px;">${isLocked ? 'Fix blockers before push' : 'Ready for release'}</div>
  </div>

  <div class="stats-grid">
    <div class="stat-card">
      <div class="stat-num" style="color: #7ee787;">${workingCount}</div>
      <div class="stat-label">Working</div>
    </div>
    <div class="stat-card">
      <div class="stat-num" style="color: #e3b341;">${waitingCount}</div>
      <div class="stat-label">Waiting</div>
    </div>
    <div class="stat-card">
      <div class="stat-num" style="color: #ff7b72;">${errorCount}</div>
      <div class="stat-label">Errors</div>
    </div>
    <div class="stat-card">
      <div class="stat-num">${total}</div>
      <div class="stat-label">Total</div>
    </div>
  </div>

  <div class="tabs-nav">
    <button class="tab-btn active" onclick="showTab('tab-modules')">${t.modulesTab}</button>
    <button class="tab-btn" onclick="showTab('tab-planner')">${t.plannerTab}</button>
    <button class="tab-btn" onclick="showTab('tab-rules')">${t.rulesTab}</button>
    <button class="tab-btn" onclick="showTab('tab-sync')">${t.syncBackupTab}</button>
    <button class="tab-btn" onclick="showTab('tab-qr')">${t.qrHardwareTab}</button>
    <button class="tab-btn" onclick="showTab('tab-release')">${t.apkReleaseTab}</button>
    <button class="tab-btn" onclick="showTab('tab-security')">${t.securityTab}</button>
    <button class="tab-btn" onclick="showTab('tab-memory')">${t.memoryTab}</button>
    <button class="tab-btn" onclick="showTab('tab-logs')">${t.logsTab}</button>
  </div>

  <!-- TAB 1: MODULES GRID -->
  <div id="tab-modules" class="tab-pane active">
    <div class="filter-bar">
      <input type="text" id="searchBox" class="search-input" placeholder="Search modules 1–50..." onkeyup="filterModules()">
      <button class="btn-sm" onclick="setFilter('ALL')">All</button>
      <button class="btn-sm" onclick="setFilter('WORKING')">Working</button>
      <button class="btn-sm" onclick="setFilter('WAITING')">Waiting</button>
      <button class="btn-sm" onclick="setFilter('ERROR')">Errors</button>
    </div>
    <table>
      <thead>
        <tr>
          <th style="width: 35px;">#</th>
          <th>Module</th>
          <th>Status</th>
          <th>Checked</th>
          <th>Issues</th>
          <th>Action</th>
        </tr>
      </thead>
      <tbody id="moduleTableBody">
        ${rows}
      </tbody>
    </table>
  </div>

  <!-- TAB 2: AI PLANNER -->
  <div id="tab-planner" class="tab-pane">
    <div class="card-box">
      <h3>🧠 AI Interactive Planner & Intent Breakdown</h3>
      <p style="color: #8b949e; font-size: 11px;">Before executing code, AI produces schema, API, UI, security, and edge-case plans requiring your approval.</p>
      <button class="btn" onclick="runPlanner()">Create New Feature Plan</button>
      <button class="btn-sm" onclick="approvePlan()">Approve Plan</button>
      <button class="btn-sm" onclick="rejectPlan()">Reject / Revise</button>
    </div>
  </div>

  <!-- TAB 3: RULES SETUP -->
  <div id="tab-rules" class="tab-pane">
    <div class="card-box">
      <h3>📜 Dynamic Custom Rules & Industry Templates</h3>
      <p style="color: #8b949e; font-size: 11px;">Manage global rules and workspace-level <code>.project-rules.json</code>.</p>
      <div style="display: flex; gap: 6px; flex-wrap: wrap;">
        <button class="btn-sm" onclick="applyTemplate('pos-inventory')">Retail POS Template</button>
        <button class="btn-sm" onclick="applyTemplate('cooperative-society')">সমিতি / Samity Template</button>
        <button class="btn-sm" onclick="applyTemplate('dairy-agro-farm')">Dairy Agro Template</button>
        <button class="btn-sm" onclick="applyTemplate('diagnostic-center')">Diagnostic Lab Template</button>
        <button class="btn-sm" onclick="applyTemplate('crm')">CRM Template</button>
        <button class="btn-sm" onclick="applyTemplate('utility-app')">Utility Template</button>
      </div>
    </div>
  </div>

  <!-- TAB 4: 4-DEVICE SYNC & BACKUP -->
  <div id="tab-sync" class="tab-pane">
    <div class="card-box">
      <h3>🔄 4-Device Cross-Platform Parity</h3>
      <p style="font-size: 12px;">Web, Android APK, Windows PC, macOS parity active. Dart:io web breaks audited.</p>
      <button class="btn-sm" onclick="runBackupTest()">Simulate Backup & Recovery</button>
    </div>
  </div>

  <!-- TAB 5: QR & HARDWARE LAB -->
  <div id="tab-qr" class="tab-pane">
    <div class="card-box">
      <h3>📱 Release APK Dynamic QR Lab</h3>
      <p style="font-size: 12px;">Generates instant scannable QR code for the latest successful GitHub artifact.</p>
      <button class="btn" onclick="generateQr()">Generate APK Download QR</button>
    </div>
  </div>

  <!-- TAB 6: APK / RELEASE BUILDER -->
  <div id="tab-release" class="tab-pane">
    <div class="card-box">
      <h3>🚀 APK / Multi-Platform Release Builder</h3>
      <p style="font-size: 12px;">Pre-flight permission check, keystore safety, semantic versioning.</p>
      <button class="btn-sm" onclick="scanManifest()">Scan AndroidManifest</button>
      <button class="btn-sm" onclick="bumpVersion()">Bump Version</button>
      <button class="btn-sm" onclick="generateCiWorkflows()">Generate CI Workflows</button>
    </div>
  </div>

  <!-- TAB 7: SECURITY & COMPLIANCE -->
  <div id="tab-security" class="tab-pane">
    <div class="card-box">
      <h3>🛡️ Enterprise Security & Vault</h3>
      <p style="font-size: 12px;">Destructive command shield active. Secrets masked automatically.</p>
      <button class="btn-sm" onclick="scanSecrets()">Deep Scan Secrets</button>
      <button class="btn-sm" onclick="scanDependencies()">Scan Dependency CVEs</button>
    </div>
  </div>

  <!-- TAB 8: PROJECT MEMORY -->
  <div id="tab-memory" class="tab-pane">
    <div class="card-box">
      <h3>💾 AI Project Memory Bank</h3>
      <p style="font-size: 12px;">Maintains tech stack, routes, models, and business logic in <code>.project-memory.json</code>.</p>
      <button class="btn-sm" onclick="openMemoryFile()">Open Memory File</button>
    </div>
  </div>

  <!-- TAB 9: LOGS & DIAGNOSTICS -->
  <div id="tab-logs" class="tab-pane">
    <div class="card-box">
      <h3>🩺 Extension Health & Self-Diagnostic</h3>
      <button class="btn-sm" onclick="runSelfDiagnostic()">Run Full Self-Diagnostic</button>
      <button class="btn-sm" onclick="exportReport()">Export Redacted Report</button>
    </div>
  </div>

  <script>
    const vscode = acquireVsCodeApi();

    function showTab(tabId) {
      document.querySelectorAll('.tab-pane').forEach(el => el.classList.remove('active'));
      document.querySelectorAll('.tab-btn').forEach(el => el.classList.remove('active'));
      const target = document.getElementById(tabId);
      if (target) {
        target.classList.add('active');
      }
      event.target.classList.add('active');
    }

    let currentFilter = 'ALL';

    function setFilter(status) {
      currentFilter = status;
      filterModules();
    }

    function filterModules() {
      const query = document.getElementById('searchBox').value.toLowerCase();
      const rows = document.querySelectorAll('#moduleTableBody tr');
      rows.forEach(row => {
        const status = row.getAttribute('data-status');
        const name = row.getAttribute('data-name');
        const matchesSearch = name.includes(query) || row.innerText.toLowerCase().includes(query);
        const matchesFilter = currentFilter === 'ALL' || status === currentFilter;
        row.style.display = (matchesSearch && matchesFilter) ? '' : 'none';
      });
    }

    function forceVerifyAll() {
      vscode.postMessage({ command: 'forceVerify' });
    }

    function toggleLang() {
      vscode.postMessage({ command: 'toggleLang' });
    }

    function openSettings() {
      vscode.postMessage({ command: 'openSettings' });
    }

    function runSingleModule(num) {
      vscode.postMessage({ command: 'runModule', moduleNumber: num });
    }

    function applyTemplate(id) {
      vscode.postMessage({ command: 'applyTemplate', templateId: id });
    }

    function runPlanner() { vscode.postMessage({ command: 'runPlanner' }); }
    function approvePlan() { vscode.postMessage({ command: 'approvePlan' }); }
    function rejectPlan() { vscode.postMessage({ command: 'rejectPlan' }); }
    function runBackupTest() { vscode.postMessage({ command: 'runBackupTest' }); }
    function generateQr() { vscode.postMessage({ command: 'generateQr' }); }
    function scanManifest() { vscode.postMessage({ command: 'scanManifest' }); }
    function bumpVersion() { vscode.postMessage({ command: 'bumpVersion' }); }
    function generateCiWorkflows() { vscode.postMessage({ command: 'generateCiWorkflows' }); }
    function scanSecrets() { vscode.postMessage({ command: 'scanSecrets' }); }
    function scanDependencies() { vscode.postMessage({ command: 'scanDependencies' }); }
    function openMemoryFile() { vscode.postMessage({ command: 'openMemoryFile' }); }
    function runSelfDiagnostic() { vscode.postMessage({ command: 'runSelfDiagnostic' }); }
    function exportReport() { vscode.postMessage({ command: 'exportReport' }); }
  </script>
</body>
</html>`;
}
