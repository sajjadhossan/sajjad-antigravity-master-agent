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
    let ledClass = 'led-green';
    let badgeClass = 'badge-working';
    let badgeLabel = t.workingStatus;

    if (m.status === ModuleStatus.WAITING) {
      ledClass = 'led-yellow';
      badgeClass = 'badge-waiting';
      badgeLabel = t.waitingStatus;
    } else if (m.status === ModuleStatus.ERROR) {
      ledClass = 'led-red';
      badgeClass = 'badge-error';
      badgeLabel = t.errorStatus;
    } else if (m.status === ModuleStatus.DISABLED) {
      ledClass = 'led-gray';
      badgeClass = 'badge-disabled';
      badgeLabel = t.disabledStatus;
    }

    const isEnabled = m.status !== ModuleStatus.DISABLED && m.enabled !== false;
    const issueCount = m.issues.length;
    const checkedTime = new Date(m.lastChecked).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });

    const issueDetails = m.issues.map(iss => `
      <div class="issue-item">
        <span class="sev-tag sev-${iss.severity.toLowerCase()}">${iss.severity}</span>
        <strong>${iss.message}</strong>
        ${iss.remediation ? `<div class="rem-text">Fix: ${iss.remediation}</div>` : ''}
      </div>
    `).join('');

    return `
      <tr data-status="${m.status}" data-name="${m.moduleName.toLowerCase()}" class="module-row">
        <td>
          <div class="led-wrapper">
            <span class="status-led ${ledClass}" title="${m.status}"></span>
            <strong>#${m.moduleNumber}</strong>
          </div>
        </td>
        <td>
          <div class="module-title-clickable" onclick="toggleDetails(${m.moduleNumber})">
            <span class="title-text">${m.moduleName}</span>
            <span class="expand-icon" id="icon-${m.moduleNumber}">▼</span>
          </div>
          ${m.degradationNote ? `<div class="note">${m.degradationNote}</div>` : ''}
          <div id="details-${m.moduleNumber}" class="module-details" style="display: none;">
            ${issueDetails ? issueDetails : '<div class="no-issues">✔ No issues detected in this module.</div>'}
          </div>
        </td>
        <td>
          <span class="badge ${badgeClass}">${badgeLabel}</span>
        </td>
        <td>
          <label class="switch" title="Toggle Module ON/OFF">
            <input type="checkbox" onchange="toggleModule(${m.moduleNumber})" ${isEnabled ? 'checked' : ''}>
            <span class="slider"></span>
          </label>
        </td>
        <td>
          <span class="count-pill ${issueCount > 0 ? 'count-error' : 'count-ok'}">${issueCount}</span>
        </td>
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
  <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; script-src 'unsafe-inline'; img-src https: data:;">
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
      padding-bottom: 10px;
      border-bottom: 1px solid var(--border-color);
    }
    .header h2 {
      margin: 0;
      font-size: 15px;
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .author-badge {
      font-size: 11px;
      color: #58a6ff;
      background: rgba(88, 166, 255, 0.12);
      padding: 2px 6px;
      border-radius: 4px;
      border: 1px solid rgba(88, 166, 255, 0.3);
      font-weight: 500;
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
      margin: 10px 0;
      padding: 10px;
      font-size: 13px;
      font-weight: 600;
      border: 1px solid rgba(255, 255, 255, 0.1);
      box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
    }
    .btn-verify:hover {
      background: #2ea043;
    }
    .btn-sm {
      background: rgba(255, 255, 255, 0.08);
      color: var(--text-color);
      border: 1px solid var(--border-color);
      padding: 3px 8px;
      border-radius: 3px;
      cursor: pointer;
      font-size: 11px;
    }
    .btn-sm:hover {
      background: rgba(255, 255, 255, 0.16);
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
      gap: 6px;
      margin-bottom: 12px;
    }
    .stat-card {
      background: rgba(255, 255, 255, 0.04);
      border: 1px solid var(--border-color);
      border-radius: 4px;
      padding: 6px;
      text-align: center;
    }
    .stat-num {
      font-size: 16px;
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
      color: #fff;
      font-weight: 600;
      border-bottom: 2px solid #58a6ff;
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
      padding: 7px 6px;
      border-bottom: 1px solid var(--border-color);
      vertical-align: middle;
    }
    th {
      font-size: 11px;
      color: #8b949e;
      text-transform: uppercase;
    }
    /* LED Status Indicator Lights */
    .led-wrapper {
      display: flex;
      align-items: center;
      gap: 6px;
    }
    .status-led {
      width: 10px;
      height: 10px;
      border-radius: 50%;
      display: inline-block;
      flex-shrink: 0;
    }
    .led-green {
      background-color: #2ea043;
      box-shadow: 0 0 8px #2ea043, inset 0 0 2px #fff;
    }
    .led-yellow {
      background-color: #d29922;
      box-shadow: 0 0 8px #d29922, inset 0 0 2px #fff;
    }
    .led-red {
      background-color: #f85149;
      box-shadow: 0 0 8px #f85149, inset 0 0 2px #fff;
    }
    .led-gray {
      background-color: #6e7681;
      box-shadow: 0 0 2px #6e7681;
    }
    /* Hardware On/Off Toggle Switch */
    .switch {
      position: relative;
      display: inline-block;
      width: 32px;
      height: 18px;
    }
    .switch input {
      opacity: 0;
      width: 0;
      height: 0;
    }
    .slider {
      position: absolute;
      cursor: pointer;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background-color: #3e444e;
      transition: .2s;
      border-radius: 18px;
    }
    .slider:before {
      position: absolute;
      content: "";
      height: 12px;
      width: 12px;
      left: 3px;
      bottom: 3px;
      background-color: white;
      transition: .2s;
      border-radius: 50%;
    }
    input:checked + .slider {
      background-color: #2ea043;
    }
    input:checked + .slider:before {
      transform: translateX(14px);
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
    .module-title-clickable {
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: space-between;
    }
    .title-text { font-weight: 500; }
    .expand-icon { font-size: 9px; color: #8b949e; margin-left: 4px; }
    .note { font-size: 10px; color: #8b949e; margin-top: 2px; }
    .module-details {
      margin-top: 6px;
      padding: 6px;
      background: rgba(0, 0, 0, 0.2);
      border-radius: 4px;
      border-left: 2px solid #58a6ff;
    }
    .issue-item {
      margin-bottom: 4px;
      font-size: 11px;
    }
    .sev-tag {
      font-size: 9px;
      padding: 1px 4px;
      border-radius: 3px;
      font-weight: 600;
      margin-right: 4px;
    }
    .sev-critical { background: #f85149; color: #fff; }
    .sev-high { background: #d29922; color: #fff; }
    .sev-medium { background: #388bfd; color: #fff; }
    .sev-low { background: #8b949e; color: #fff; }
    .rem-text { font-size: 10px; color: #8b949e; margin-top: 2px; padding-left: 12px; }
    .no-issues { font-size: 11px; color: #7ee787; }
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
    <div>
      <h2>🛡️ Sajjad Antigravity Master <span>v8.0.0</span></h2>
      <div class="author-badge">Architect: Sajjad Hossan (সাজ্জাদ হোসেন)</div>
    </div>
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
    <button class="tab-btn active" onclick="switchTab('tab-modules', this)">${t.modulesTab}</button>
    <button class="tab-btn" onclick="switchTab('tab-planner', this)">${t.plannerTab}</button>
    <button class="tab-btn" onclick="switchTab('tab-rules', this)">${t.rulesTab}</button>
    <button class="tab-btn" onclick="switchTab('tab-sync', this)">${t.syncBackupTab}</button>
    <button class="tab-btn" onclick="switchTab('tab-qr', this)">${t.qrHardwareTab}</button>
    <button class="tab-btn" onclick="switchTab('tab-release', this)">${t.apkReleaseTab}</button>
    <button class="tab-btn" onclick="switchTab('tab-security', this)">${t.securityTab}</button>
    <button class="tab-btn" onclick="switchTab('tab-memory', this)">${t.memoryTab}</button>
    <button class="tab-btn" onclick="switchTab('tab-logs', this)">${t.logsTab}</button>
  </div>

  <!-- TAB 1: MODULES GRID (50-in-1 Table with LED Lights & On/Off Switches) -->
  <div id="tab-modules" class="tab-pane active">
    <div class="filter-bar">
      <input type="text" id="searchBox" class="search-input" placeholder="Search modules 1–50..." onkeyup="filterModules()">
      <button class="btn-sm" onclick="setFilter('ALL')">All (50)</button>
      <button class="btn-sm" onclick="setFilter('WORKING')">🟢 Working</button>
      <button class="btn-sm" onclick="setFilter('WAITING')">🟡 Waiting</button>
      <button class="btn-sm" onclick="setFilter('ERROR')">🔴 Errors</button>
      <button class="btn-sm" onclick="setFilter('DISABLED')">⚪ Disabled</button>
    </div>
    <table>
      <thead>
        <tr>
          <th style="width: 50px;">Status</th>
          <th>Module (Click to View Details)</th>
          <th>State</th>
          <th style="width: 40px;">On/Off</th>
          <th style="width: 35px;">Issues</th>
          <th style="width: 45px;">Action</th>
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
      <h3>🧠 Sajjad AI Interactive Planner & Intent Breakdown</h3>
      <p style="color: #8b949e; font-size: 11px;">Before executing code, AI produces schema, API, UI, security, and edge-case plans requiring your approval.</p>
      <button class="btn" onclick="runPlanner()">Create New Feature Plan</button>
      <div style="margin-top: 8px; display: flex; gap: 6px;">
        <button class="btn-sm" onclick="approvePlan()">Approve Plan</button>
        <button class="btn-sm" onclick="rejectPlan()">Reject / Revise</button>
      </div>
    </div>
  </div>

  <!-- TAB 3: RULES SETUP -->
  <div id="tab-rules" class="tab-pane">
    <div class="card-box">
      <h3>📜 Sajjad Dynamic Rules & Industry Templates</h3>
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
      <div style="display: flex; gap: 6px; flex-wrap: wrap;">
        <button class="btn-sm" onclick="scanManifest()">Scan AndroidManifest</button>
        <button class="btn-sm" onclick="bumpVersion()">Bump Version</button>
        <button class="btn-sm" onclick="generateCiWorkflows()">Generate CI Workflows</button>
      </div>
    </div>
  </div>

  <!-- TAB 7: SECURITY & COMPLIANCE -->
  <div id="tab-security" class="tab-pane">
    <div class="card-box">
      <h3>🛡️ Enterprise Security & Vault</h3>
      <p style="font-size: 12px;">Destructive command shield active. Secrets masked automatically.</p>
      <div style="display: flex; gap: 6px;">
        <button class="btn-sm" onclick="scanSecrets()">Deep Scan Secrets</button>
        <button class="btn-sm" onclick="scanDependencies()">Scan Dependency CVEs</button>
      </div>
    </div>
  </div>

  <!-- TAB 8: PROJECT MEMORY -->
  <div id="tab-memory" class="tab-pane">
    <div class="card-box">
      <h3>💾 Sajjad AI Project Memory Bank</h3>
      <p style="font-size: 12px;">Maintains tech stack, routes, models, and business logic in <code>.project-memory.json</code>.</p>
      <button class="btn-sm" onclick="openMemoryFile()">Open Memory File</button>
    </div>
  </div>

  <!-- TAB 9: LOGS & DIAGNOSTICS -->
  <div id="tab-logs" class="tab-pane">
    <div class="card-box">
      <h3>🩺 Extension Health & Self-Diagnostic</h3>
      <div style="display: flex; gap: 6px;">
        <button class="btn-sm" onclick="runSelfDiagnostic()">Run Full Self-Diagnostic</button>
        <button class="btn-sm" onclick="exportReport()">Export Redacted Report</button>
      </div>
    </div>
  </div>

  <script>
    const vscode = acquireVsCodeApi();

    function switchTab(tabId, btn) {
      document.querySelectorAll('.tab-pane').forEach(el => el.classList.remove('active'));
      document.querySelectorAll('.tab-btn').forEach(el => el.classList.remove('active'));
      const target = document.getElementById(tabId);
      if (target) {
        target.classList.add('active');
      }
      if (btn) {
        btn.classList.add('active');
      }
    }

    function toggleDetails(moduleNum) {
      const panel = document.getElementById('details-' + moduleNum);
      const icon = document.getElementById('icon-' + moduleNum);
      if (panel) {
        const isHidden = panel.style.display === 'none';
        panel.style.display = isHidden ? 'block' : 'none';
        if (icon) {
          icon.innerText = isHidden ? '▲' : '▼';
        }
      }
    }

    let currentFilter = 'ALL';

    function setFilter(status) {
      currentFilter = status;
      filterModules();
    }

    function filterModules() {
      const query = (document.getElementById('searchBox').value || '').toLowerCase();
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

    function toggleModule(num) {
      vscode.postMessage({ command: 'toggleModule', moduleNumber: num });
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
