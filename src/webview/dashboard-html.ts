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

  // 5 Enterprise Pillars Mapping
  const pillarsDef = [
    {
      id: 'security',
      title: t.securityPillar,
      icon: '🛡️',
      categories: ['security', 'rules', 'financial'],
    },
    {
      id: 'apk',
      title: t.apkPillar,
      icon: '📱',
      categories: ['android', 'build', 'ci/cd', 'release', 'crossplatform'],
    },
    {
      id: 'codeQuality',
      title: t.codeQualityPillar,
      icon: '🧪',
      categories: ['codequality', 'testing', 'performance', 'i18n'],
    },
    {
      id: 'syncBackup',
      title: t.syncBackupPillar,
      icon: '💾',
      categories: ['datasafety', 'database', 'automation'],
    },
    {
      id: 'architecture',
      title: t.architecturePillar,
      icon: '🏛️',
      categories: ['architecture', 'ui/ux', 'brand', 'hardware', 'releasegate', 'ai'],
    },
  ];

  const pillarCardsHtml = pillarsDef.map((p, idx) => {
    const matched = modules.filter(m => {
      const cat = (m.category || '').toLowerCase();
      return p.categories.some(c => cat.includes(c) || m.moduleName.toLowerCase().includes(c));
    });
    const pTotal = matched.length || 1;
    const pWorking = matched.filter(m => m.status === ModuleStatus.WORKING).length;
    const pError = matched.filter(m => m.status === ModuleStatus.ERROR).length;
    const pPct = Math.round((pWorking / pTotal) * 100);
    const pColor = pError > 0 ? 'var(--vscode-charts-red, #f85149)' : (pPct >= 80 ? 'var(--vscode-charts-green, #2ea043)' : 'var(--vscode-charts-yellow, #d29922)');

    return `
      <div class="pillar-row" onclick="filterByPillar('${p.categories.join(',')}')" title="Filter to ${p.title}">
        <div class="pillar-meta">
          <span>${p.icon} ${p.title}</span>
          <span style="color: ${pColor}; font-weight: 600;">${pPct}% (${pWorking}/${pTotal})</span>
        </div>
        <div class="pillar-progress-track">
          <div class="pillar-progress-fill" style="width: ${pPct}%; background: ${pColor};"></div>
        </div>
      </div>
    `;
  }).join('');

  // Overall Project Health Score calculation
  const rawHealth = total > 0 ? ((workingCount * 1.0 + waitingCount * 0.4 - errorCount * 1.5) / total) * 100 : 0;
  const healthScore = Math.max(0, Math.min(100, Math.round(rawHealth)));

  // SVG Gauge calculations (circumference for r=36 is 226)
  const circumference = 226;
  const dashOffset = Math.round(circumference - (circumference * healthScore) / 100);

  let healthColor = 'var(--vscode-charts-green, #2ea043)';
  let gradeText = 'Grade A+ (Ready)';
  let gradeBadgeBg = 'rgba(46, 160, 67, 0.15)';
  let gradeBadgeBorder = 'rgba(46, 160, 67, 0.4)';

  if (errorCount > 0 || healthScore < 75) {
    healthColor = 'var(--vscode-charts-red, #f85149)';
    gradeText = 'Grade C (Blockers)';
    gradeBadgeBg = 'rgba(248, 81, 73, 0.15)';
    gradeBadgeBorder = 'rgba(248, 81, 73, 0.4)';
  } else if (healthScore < 90) {
    healthColor = 'var(--vscode-charts-yellow, #d29922)';
    gradeText = 'Grade B (Config Needed)';
    gradeBadgeBg = 'rgba(210, 153, 34, 0.15)';
    gradeBadgeBorder = 'rgba(210, 153, 34, 0.4)';
  }

  function renderModuleRow(m: IModuleScanResult): string {
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

    const issueDetails = m.issues.map(iss => `
      <div class="issue-item">
        <span class="sev-tag sev-${iss.severity.toLowerCase()}">${iss.severity}</span>
        <strong>${iss.message}</strong>
        ${iss.remediation ? `<div class="rem-text">Fix: ${iss.remediation}</div>` : ''}
      </div>
    `).join('');

    return `
      <tr data-status="${m.status}" data-name="${m.moduleName.toLowerCase()}" data-category="${(m.category || '').toLowerCase()}" class="module-row">
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
  }

  // Generate Accordion Sections for Tab 2
  const accordionSectionsHtml = pillarsDef.map((p, idx) => {
    const matched = modules.filter(m => {
      const cat = (m.category || '').toLowerCase();
      return p.categories.some(c => cat.includes(c) || m.moduleName.toLowerCase().includes(c));
    });
    const pTotal = matched.length || 1;
    const pWorking = matched.filter(m => m.status === ModuleStatus.WORKING).length;
    const pError = matched.filter(m => m.status === ModuleStatus.ERROR).length;
    const pPct = Math.round((pWorking / pTotal) * 100);
    const pColor = pError > 0 ? 'var(--vscode-charts-red, #f85149)' : (pPct >= 80 ? 'var(--vscode-charts-green, #2ea043)' : 'var(--vscode-charts-yellow, #d29922)');
    const tableRows = matched.map(m => renderModuleRow(m)).join('');

    return `
      <div class="accordion-group" id="acc-group-${idx}">
        <div class="accordion-header" onclick="toggleAccordion('acc-${idx}')">
          <div class="accordion-title">
            <span class="acc-chevron" id="acc-chev-${idx}">▼</span>
            <span>${p.icon} <strong>${p.title}</strong></span>
            <span class="acc-count-pill" style="color: ${pColor};">(${pWorking}/${pTotal})</span>
          </div>
          <div class="acc-badge" style="background: rgba(255,255,255,0.06); color: ${pColor};">${pPct}%</div>
        </div>
        <div class="accordion-body" id="acc-${idx}">
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
            <tbody class="module-tbody">
              ${tableRows}
            </tbody>
          </table>
        </div>
      </div>
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
      --border-color: var(--vscode-panel-border, #333333);
      --accent-color: var(--vscode-button-background, #0e639c);
      --accent-hover: var(--vscode-button-hoverBackground, #1177bb);
      --btn-text: var(--vscode-button-foreground, #ffffff);
      --badge-working: var(--vscode-charts-green, #2ea043);
      --badge-waiting: var(--vscode-charts-yellow, #d29922);
      --badge-error: var(--vscode-charts-red, #f85149);
      --badge-disabled: var(--vscode-descriptionForeground, #8b949e);
    }
    body {
      background-color: var(--bg-color);
      color: var(--text-color);
      font-family: var(--vscode-font-family, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif);
      margin: 0;
      padding: 12px;
      font-size: var(--vscode-font-size, 13px);
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
      color: var(--vscode-textLink-foreground, #58a6ff);
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
    .top-action-bar {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 8px;
      margin: 10px 0;
    }
    .btn {
      background: var(--accent-color);
      color: var(--btn-text);
      border: none;
      padding: 8px 12px;
      border-radius: 4px;
      cursor: pointer;
      font-weight: 600;
      font-size: 12px;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 6px;
      transition: background 0.15s ease;
    }
    .btn:hover {
      background: var(--accent-hover);
    }
    .btn-verify {
      background: #238636;
      color: #ffffff;
      border: 1px solid rgba(255, 255, 255, 0.1);
    }
    .btn-verify:hover {
      background: #2ea043;
    }
    .btn-heal {
      background: linear-gradient(135deg, #1f6feb 0%, #238636 100%);
      color: #ffffff;
      border: 1px solid rgba(255, 255, 255, 0.1);
    }
    .btn-heal:hover {
      background: linear-gradient(135deg, #388bfd 0%, #2ea043 100%);
    }
    .btn-sm {
      background: rgba(255, 255, 255, 0.08);
      color: var(--text-color);
      border: 1px solid var(--border-color);
      padding: 4px 8px;
      border-radius: 3px;
      cursor: pointer;
      font-size: 11px;
    }
    .btn-sm:hover {
      background: rgba(255, 255, 255, 0.15);
    }
    .gate-banner {
      padding: 8px 12px;
      border-radius: 4px;
      margin: 8px 0;
      font-weight: 600;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .gate-locked {
      background: rgba(248, 81, 73, 0.15);
      border: 1px solid rgba(248, 81, 73, 0.4);
      color: var(--vscode-charts-red, #ff7b72);
    }
    .gate-passed {
      background: rgba(46, 160, 67, 0.15);
      border: 1px solid rgba(46, 160, 67, 0.4);
      color: var(--vscode-charts-green, #7ee787);
    }

    /* Health Meter & 5-Pillars Radar Card */
    .health-radar-card {
      background: rgba(255, 255, 255, 0.03);
      border: 1px solid var(--border-color);
      border-radius: 8px;
      padding: 12px;
      margin: 10px 0;
      display: grid;
      grid-template-columns: 140px 1fr;
      gap: 16px;
      align-items: center;
    }
    .score-circle-wrapper {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      text-align: center;
    }
    .score-svg {
      transform: rotate(-90deg);
      width: 88px;
      height: 88px;
    }
    .score-bg-circle {
      stroke: rgba(255, 255, 255, 0.1);
      stroke-width: 8;
      fill: transparent;
    }
    .score-bar-circle {
      stroke-width: 8;
      stroke-linecap: round;
      fill: transparent;
      transition: stroke-dashoffset 0.8s ease-in-out;
    }
    .score-text {
      font-size: 20px;
      font-weight: 700;
      fill: var(--text-color);
      transform: rotate(90deg);
      transform-origin: 50% 50%;
    }
    .grade-badge {
      margin-top: 6px;
      font-size: 10px;
      font-weight: 600;
      padding: 2px 8px;
      border-radius: 12px;
      display: inline-block;
      white-space: nowrap;
    }
    .pillars-wrapper {
      display: flex;
      flex-direction: column;
      gap: 6px;
    }
    .radar-header {
      font-size: 11px;
      font-weight: 600;
      color: var(--vscode-descriptionForeground, #8b949e);
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin-bottom: 2px;
    }
    .pillar-row {
      display: flex;
      flex-direction: column;
      gap: 2px;
      cursor: pointer;
      padding: 3px 5px;
      border-radius: 4px;
      transition: background 0.15s ease;
    }
    .pillar-row:hover {
      background: rgba(255, 255, 255, 0.06);
    }
    .pillar-meta {
      display: flex;
      justify-content: space-between;
      font-size: 11px;
      font-weight: 500;
    }
    .pillar-progress-track {
      width: 100%;
      height: 5px;
      background: rgba(255, 255, 255, 0.1);
      border-radius: 3px;
      overflow: hidden;
    }
    .pillar-progress-fill {
      height: 100%;
      border-radius: 3px;
      transition: width 0.6s ease;
    }

    .stats-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 8px;
      margin: 10px 0;
    }
    .stat-card {
      background: rgba(255, 255, 255, 0.04);
      border: 1px solid var(--border-color);
      border-radius: 6px;
      padding: 8px 4px;
      text-align: center;
    }
    .stat-num {
      font-size: 18px;
      font-weight: bold;
    }
    .stat-label {
      font-size: 10px;
      color: var(--vscode-descriptionForeground, #8b949e);
      text-transform: uppercase;
      margin-top: 2px;
    }

    /* Modern 4 Executive Navigation Tabs */
    .tabs-nav {
      display: flex;
      gap: 4px;
      border-bottom: 1px solid var(--border-color);
      margin-top: 12px;
      margin-bottom: 12px;
    }
    .tab-btn {
      background: transparent;
      border: none;
      color: var(--vscode-descriptionForeground, #8b949e);
      padding: 8px 12px;
      cursor: pointer;
      font-size: 12px;
      font-weight: 500;
      border-bottom: 2px solid transparent;
      display: flex;
      align-items: center;
      gap: 6px;
    }
    .tab-btn:hover {
      color: var(--text-color);
    }
    .tab-btn.active {
      color: var(--vscode-textLink-foreground, #58a6ff);
      border-bottom: 2px solid var(--vscode-textLink-foreground, #58a6ff);
      font-weight: 600;
    }
    .tab-pane {
      display: none;
    }
    .tab-pane.active {
      display: block;
    }

    /* Accordion Groups */
    .accordion-toolbar {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 8px;
    }
    .accordion-group {
      border: 1px solid var(--border-color);
      border-radius: 6px;
      margin-bottom: 8px;
      background: rgba(255, 255, 255, 0.02);
      overflow: hidden;
    }
    .accordion-header {
      padding: 8px 12px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      cursor: pointer;
      user-select: none;
      background: rgba(255, 255, 255, 0.04);
      transition: background 0.15s ease;
    }
    .accordion-header:hover {
      background: rgba(255, 255, 255, 0.08);
    }
    .accordion-title {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 12px;
    }
    .acc-chevron {
      font-size: 9px;
      color: #8b949e;
    }
    .acc-count-pill {
      font-size: 11px;
      font-weight: 600;
    }
    .acc-badge {
      font-size: 11px;
      font-weight: 600;
      padding: 1px 6px;
      border-radius: 10px;
    }
    .accordion-body {
      padding: 0;
    }

    .filter-bar {
      display: flex;
      gap: 6px;
      margin-bottom: 8px;
      flex-wrap: wrap;
    }
    .search-input {
      background: var(--vscode-input-background, #2d2d2d);
      color: var(--vscode-input-foreground, #fff);
      border: 1px solid var(--vscode-input-border, var(--border-color));
      border-radius: 4px;
      padding: 5px 8px;
      font-size: 12px;
      flex: 1;
      min-width: 140px;
    }

    table {
      width: 100%;
      border-collapse: collapse;
      font-size: 12px;
    }
    th, td {
      padding: 6px 8px;
      text-align: left;
      border-bottom: 1px solid var(--border-color);
    }
    th {
      color: var(--vscode-descriptionForeground, #8b949e);
      font-weight: 600;
      background: rgba(255, 255, 255, 0.02);
    }
    .led-wrapper {
      display: flex;
      align-items: center;
      gap: 6px;
    }
    .status-led {
      width: 8px;
      height: 88px;
      height: 8px;
      border-radius: 50%;
      display: inline-block;
    }
    .led-green { background: #2ea043; box-shadow: 0 0 6px rgba(46, 160, 67, 0.6); }
    .led-yellow { background: #d29922; box-shadow: 0 0 6px rgba(210, 153, 34, 0.6); }
    .led-red { background: #f85149; box-shadow: 0 0 6px rgba(248, 81, 73, 0.6); }
    .led-gray { background: #8b949e; }
    .switch {
      position: relative;
      display: inline-block;
      width: 28px;
      height: 16px;
    }
    .switch input { opacity: 0; width: 0; height: 0; }
    .slider {
      position: absolute;
      cursor: pointer;
      top: 0; left: 0; right: 0; bottom: 0;
      background-color: #444;
      transition: .2s;
      border-radius: 16px;
    }
    .slider:before {
      position: absolute;
      content: "";
      height: 12px;
      width: 12px;
      left: 2px;
      bottom: 2px;
      background-color: white;
      transition: .2s;
      border-radius: 50%;
    }
    input:checked + .slider { background-color: #238636; }
    input:checked + .slider:before { transform: translateX(12px); }

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
      border-radius: 6px;
      padding: 12px;
      margin-bottom: 10px;
    }
    .card-box h3 { margin-top: 0; font-size: 13px; display: flex; align-items: center; gap: 6px; }

    @media (max-width: 320px) {
      .health-radar-card {
        grid-template-columns: 1fr;
        justify-items: center;
      }
      .top-action-bar {
        grid-template-columns: 1fr;
      }
    }
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

  <div class="top-action-bar">
    <button class="btn btn-verify" onclick="forceVerifyAll()">${t.forceVerifyBtn}</button>
    <button class="btn btn-heal" onclick="autoHeal()">${t.autoHealBtn}</button>
  </div>

  <div class="tabs-nav">
    <button class="tab-btn active" onclick="switchTab('tab-overview', this)">${t.tabOverview}</button>
    <button class="tab-btn" onclick="switchTab('tab-modules', this)">${t.tabModulesNav} (50)</button>
    <button class="tab-btn" onclick="switchTab('tab-devops', this)">${t.tabDevops}</button>
    <button class="tab-btn" onclick="switchTab('tab-rules-ai', this)">${t.tabRulesAi}</button>
  </div>

  <!-- TAB 1: OVERVIEW & HEALTH RADAR -->
  <div id="tab-overview" class="tab-pane active">
    <div class="gate-banner ${isLocked ? 'gate-locked' : 'gate-passed'}">
      <div>${isLocked ? t.releaseGateLocked : t.releaseGatePassed}</div>
      <div style="font-size: 11px;">${isLocked ? 'Fix blockers before push' : 'Ready for release'}</div>
    </div>

    <div class="health-radar-card">
      <div class="score-circle-wrapper">
        <svg class="score-svg" viewBox="0 0 88 88">
          <circle class="score-bg-circle" cx="44" cy="44" r="36"></circle>
          <circle class="score-bar-circle" cx="44" cy="44" r="36" style="stroke: ${healthColor}; stroke-dasharray: 226; stroke-dashoffset: ${dashOffset};"></circle>
          <text class="score-text" x="44" y="44" text-anchor="middle" dominant-baseline="central">${healthScore}%</text>
        </svg>
        <div class="grade-badge" style="background: ${gradeBadgeBg}; color: ${healthColor}; border: 1px solid ${gradeBadgeBorder};">
          ${gradeText}
        </div>
      </div>
      <div class="pillars-wrapper">
        <div class="radar-header">${t.complianceRadarTitle}</div>
        ${pillarCardsHtml}
      </div>
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
  </div>

  <!-- TAB 2: MODULES 1–50 (ACCORDION PILLAR VIEW) -->
  <div id="tab-modules" class="tab-pane">
    <div class="accordion-toolbar">
      <div class="filter-bar" style="margin-bottom: 0;">
        <input type="text" id="searchBox" class="search-input" placeholder="Search modules 1–50..." onkeyup="filterModules()">
        <button class="btn-sm" onclick="setFilter('ALL')">All</button>
        <button class="btn-sm" onclick="setFilter('WORKING')">🟢</button>
        <button class="btn-sm" onclick="setFilter('WAITING')">🟡</button>
        <button class="btn-sm" onclick="setFilter('ERROR')">🔴</button>
      </div>
      <div style="display: flex; gap: 4px;">
        <button class="btn-sm" onclick="expandAllAccordions()">${t.expandAllBtn}</button>
        <button class="btn-sm" onclick="collapseAllAccordions()">${t.collapseAllBtn}</button>
      </div>
    </div>
    <div id="accordionContainer">
      ${accordionSectionsHtml}
    </div>
  </div>

  <!-- TAB 3: DEVOPS & LAB TOOLS -->
  <div id="tab-devops" class="tab-pane">
    <div class="card-box">
      <h3>🔐 Real Encrypted Backup & Restore</h3>
      <p style="font-size: 11px; color: #8b949e;">Compresses and verifies workspace snapshots with SHA-256 checksums.</p>
      <div style="display: flex; gap: 6px;">
        <button class="btn-sm" onclick="runBackupTest()">Create Encrypted Snapshot</button>
        <button class="btn-sm" onclick="validateRestore()">Validate Restore Integrity</button>
      </div>
    </div>

    <div class="card-box">
      <h3>🛡️ Deep Security & Secret Auditor</h3>
      <p style="font-size: 11px; color: #8b949e;">Scans for plaintext credentials, Firebase keys, tokens, and dependency vulnerabilities.</p>
      <div style="display: flex; gap: 6px;">
        <button class="btn-sm" onclick="scanSecrets()">Deep Scan Secrets</button>
        <button class="btn-sm" onclick="scanDependencies()">Audit Dependencies (OWASP)</button>
      </div>
    </div>

    <div class="card-box">
      <h3>📱 Multi-Platform Android & APK Release</h3>
      <p style="font-size: 11px; color: #8b949e;">Inspects AndroidManifest permissions, keystore signing, and release QR generator.</p>
      <div style="display: flex; gap: 6px;">
        <button class="btn-sm" onclick="scanManifest()">Inspect Manifest</button>
        <button class="btn-sm" onclick="generateQr()">Generate Release APK QR</button>
        <button class="btn-sm" onclick="generateCiWorkflows()">Generate CI/CD Workflows</button>
      </div>
    </div>

    <div class="card-box">
      <h3>🩺 Self-Diagnostics & Audit Report</h3>
      <div style="display: flex; gap: 6px;">
        <button class="btn-sm" onclick="runSelfDiagnostic()">Run Self-Diagnostic</button>
        <button class="btn-sm" onclick="exportReport()">Export Redacted Report</button>
      </div>
    </div>
  </div>

  <!-- TAB 4: RULES & AI PLANNER -->
  <div id="tab-rules-ai" class="tab-pane">
    <div class="card-box">
      <h3>🧠 Sajjad AI Interactive Planner</h3>
      <p style="font-size: 11px; color: #8b949e;">Produces schema, API, UI, and edge-case blueprints requiring human approval.</p>
      <button class="btn" onclick="runPlanner()" style="margin-bottom: 8px;">Create New Feature Plan</button>
      <div style="display: flex; gap: 6px;">
        <button class="btn-sm" onclick="approvePlan()">Approve Plan</button>
        <button class="btn-sm" onclick="rejectPlan()">Reject / Revise</button>
      </div>
    </div>

    <div class="card-box">
      <h3>📜 Industry Rule Templates</h3>
      <p style="font-size: 11px; color: #8b949e;">Apply tailored enterprise rule sets to <code>.project-rules.json</code>.</p>
      <div style="display: flex; gap: 6px; flex-wrap: wrap;">
        <button class="btn-sm" onclick="applyTemplate('pos-inventory')">Retail POS Template</button>
        <button class="btn-sm" onclick="applyTemplate('cooperative-society')">সমিতি / Samity Template</button>
        <button class="btn-sm" onclick="applyTemplate('dairy-agro-farm')">Dairy Agro Template</button>
        <button class="btn-sm" onclick="applyTemplate('diagnostic-center')">Diagnostic Center</button>
        <button class="btn-sm" onclick="applyTemplate('crm')">CRM Template</button>
        <button class="btn-sm" onclick="applyTemplate('utility-app')">Utility Template</button>
      </div>
    </div>

    <div class="card-box">
      <h3>💾 Project Memory Bank</h3>
      <p style="font-size: 11px; color: #8b949e;">Maintains stack, models, routes, and business rules in <code>.project-memory.json</code>.</p>
      <button class="btn-sm" onclick="openMemoryFile()">Open .project-memory.json</button>
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

    function toggleAccordion(accId) {
      const body = document.getElementById(accId);
      const idx = accId.replace('acc-', '');
      const chev = document.getElementById('acc-chev-' + idx);
      if (body) {
        const isClosed = body.style.display === 'none';
        body.style.display = isClosed ? 'block' : 'none';
        if (chev) {
          chev.innerText = isClosed ? '▼' : '▶';
        }
      }
    }

    function expandAllAccordions() {
      document.querySelectorAll('.accordion-body').forEach(b => b.style.display = 'block');
      document.querySelectorAll('.acc-chevron').forEach(c => c.innerText = '▼');
    }

    function collapseAllAccordions() {
      document.querySelectorAll('.accordion-body').forEach(b => b.style.display = 'none');
      document.querySelectorAll('.acc-chevron').forEach(c => c.innerText = '▶');
    }

    let currentFilter = 'ALL';

    function setFilter(status) {
      currentFilter = status;
      filterModules();
    }

    function filterModules() {
      const query = (document.getElementById('searchBox').value || '').toLowerCase();
      const rows = document.querySelectorAll('.module-row');
      rows.forEach(row => {
        const status = row.getAttribute('data-status');
        const name = row.getAttribute('data-name');
        const matchesSearch = name.includes(query) || row.innerText.toLowerCase().includes(query);
        const matchesFilter = currentFilter === 'ALL' || status === currentFilter;
        row.style.display = (matchesSearch && matchesFilter) ? '' : 'none';
      });
      if (query) {
        expandAllAccordions();
      }
    }

    function filterByPillar(catString) {
      const cats = catString.toLowerCase().split(',');
      const rows = document.querySelectorAll('.module-row');
      rows.forEach(row => {
        const rowCat = (row.getAttribute('data-category') || '').toLowerCase();
        const rowName = (row.getAttribute('data-name') || '').toLowerCase();
        const matches = cats.some(c => rowCat.includes(c) || rowName.includes(c));
        row.style.display = matches ? '' : 'none';
      });
      expandAllAccordions();
      const modTabBtn = document.querySelectorAll('.tab-btn')[1];
      if (modTabBtn) {
        switchTab('tab-modules', modTabBtn);
      }
    }

    function forceVerifyAll() {
      vscode.postMessage({ command: 'forceVerify' });
    }

    function autoHeal() {
      vscode.postMessage({ command: 'autoHeal' });
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
    function validateRestore() { vscode.postMessage({ command: 'validateRestore' }); }
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
