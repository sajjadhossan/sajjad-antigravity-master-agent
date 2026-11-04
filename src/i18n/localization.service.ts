import * as vscode from 'vscode';

export type SupportedLanguage = 'en' | 'bn';

interface ILocaleStrings {
  commandCenterTitle: string;
  forceVerifyBtn: string;
  modulesTab: string;
  plannerTab: string;
  rulesTab: string;
  syncBackupTab: string;
  qrHardwareTab: string;
  apkReleaseTab: string;
  securityTab: string;
  memoryTab: string;
  logsTab: string;
  workingStatus: string;
  waitingStatus: string;
  errorStatus: string;
  disabledStatus: string;
  releaseGateLocked: string;
  releaseGatePassed: string;
  filterAll: string;
  totalModulesLabel: string;
  blockersLabel: string;
  warningsLabel: string;
  passedLabel: string;
  healthScoreLabel: string;
  complianceRadarTitle: string;
  securityPillar: string;
  apkPillar: string;
  codeQualityPillar: string;
  syncBackupPillar: string;
  architecturePillar: string;
  tabOverview: string;
  tabModulesNav: string;
  tabDevops: string;
  tabRulesAi: string;
  autoHealBtn: string;
  expandAllBtn: string;
  collapseAllBtn: string;
}

const enStrings: ILocaleStrings = {
  commandCenterTitle: 'Sajjad Antigravity Master Command Center',
  forceVerifyBtn: '🛡️ Force-Verify 1–50 & Prepare Release',
  modulesTab: 'Dashboard & Live Status',
  plannerTab: 'AI Intent & Planner',
  rulesTab: 'Rules Setup',
  syncBackupTab: '4-Device Sync & Backup',
  qrHardwareTab: 'QR & Hardware Lab',
  apkReleaseTab: 'APK / Release Builder',
  securityTab: 'Security & Compliance',
  memoryTab: 'Project Memory',
  logsTab: 'Logs & Diagnostics',
  workingStatus: '🟢 WORKING',
  waitingStatus: '🟡 WAITING / NEEDS CONFIG',
  errorStatus: '🔴 ERROR',
  disabledStatus: '⚪ DISABLED',
  releaseGateLocked: '🛡️ RELEASE GATE: BLOCKED',
  releaseGatePassed: '🛡️ RELEASE GATE: PASS',
  filterAll: 'All Modules',
  totalModulesLabel: 'Total Modules',
  blockersLabel: 'Critical Blockers',
  warningsLabel: 'Warnings',
  passedLabel: 'Passed',
  healthScoreLabel: 'Project Health & Compliance Score',
  complianceRadarTitle: '5-Pillar Enterprise Compliance Radar',
  securityPillar: 'Security & Secrets',
  apkPillar: 'Multi-Platform & APK',
  codeQualityPillar: 'Code Quality & Tests',
  syncBackupPillar: 'Data Sync & Backup',
  architecturePillar: 'Architecture & Multi-Tenancy',
  tabOverview: '📊 Overview & Health',
  tabModulesNav: '🛡️ Guard 1–50',
  tabDevops: '🛠️ DevOps & Lab',
  tabRulesAi: '⚖️ Rules & AI',
  autoHealBtn: '⚡ 1-Click Auto-Heal',
  expandAllBtn: 'Expand All',
  collapseAllBtn: 'Collapse All',
};

const bnStrings: ILocaleStrings = {
  commandCenterTitle: 'সাজ্জাদ অ্যান্টিগ্র্যাভিটি মাস্টার কমান্ড সেন্টার',
  forceVerifyBtn: '🛡️ ৫০টি মডিউল যাচাই ও রিলিজ প্রস্তুত করুন',
  modulesTab: 'ড্যাশবোর্ড ও লাইভ স্ট্যাটাস',
  plannerTab: 'এআই ইনটেন্ট ও প্ল্যানার',
  rulesTab: 'রুলস সেটআপ',
  syncBackupTab: '৪-ডিভাইস সিঙ্ক ও ব্যাকআপ',
  qrHardwareTab: 'কিউআর ও হার্ডওয়্যার ল্যাব',
  apkReleaseTab: 'এপিকে / রিলিজ বিল্ডার',
  securityTab: 'সিকিউরিটি ও কমপ্লায়েন্স',
  memoryTab: 'প্রজেক্ট মেমোরি',
  logsTab: 'লগ ও ডায়াগনস্টিকস',
  workingStatus: '🟢 সচল / WORKING',
  waitingStatus: '🟡 কনফিগারেশন প্রয়োজন / WAITING',
  errorStatus: '🔴 ত্রুটি / ERROR',
  disabledStatus: '⚪ নিষ্ক্রিয় / DISABLED',
  releaseGateLocked: '🛡️ রিলিজ গেট: অবরুদ্ধ / BLOCKED',
  releaseGatePassed: '🛡️ রিলিজ গেট: অনুমোদিত / PASS',
  filterAll: 'সবগুলো মডিউল',
  totalModulesLabel: 'মোট মডিউল',
  blockersLabel: 'জরুরি ত্রুটি',
  warningsLabel: 'সতর্কতা',
  passedLabel: 'উত্তীর্ণ',
  healthScoreLabel: 'প্রজেক্ট হেলথ ও কমপ্লায়েন্স স্কোর',
  complianceRadarTitle: '৫-স্তম্ভ এন্টারপ্রাইজ কমপ্লায়েন্স রাডার',
  securityPillar: 'সিকিউরিটি ও সিক্রেট গার্ড',
  apkPillar: 'মাল্টি-প্ল্যাটফর্ম ও এপিকে',
  codeQualityPillar: 'কোড কোয়ালিটি ও টেস্ট',
  syncBackupPillar: 'ডেটা সিঙ্ক ও ব্যাকআপ',
  architecturePillar: 'আর্কিটেকচার ও মাল্টি-টেন্যান্ট',
  tabOverview: '📊 ওভারভিউ ও হেলথ',
  tabModulesNav: '🛡️ গার্ড ১–৫০',
  tabDevops: '🛠️ ডিভঅপ্স ও ল্যাব',
  tabRulesAi: '⚖️ রুলস ও এআই',
  autoHealBtn: '⚡ ১-ক্লিকে অটো-হিল (Auto-Heal)',
  expandAllBtn: 'সব খুলুন',
  collapseAllBtn: 'সব বন্ধ করুন',
};

export class LocalizationService {
  private static instance: LocalizationService;
  private currentLanguage: SupportedLanguage = 'en';

  private constructor() {
    this.detectLanguage();
  }

  public static getInstance(): LocalizationService {
    if (!LocalizationService.instance) {
      LocalizationService.instance = new LocalizationService();
    }
    return LocalizationService.instance;
  }

  public detectLanguage(): void {
    const config = vscode.workspace.getConfiguration('antigravityMaster');
    const setting = config.get<string>('ui.language', 'auto');
    if (setting === 'bn') {
      this.currentLanguage = 'bn';
    } else if (setting === 'en') {
      this.currentLanguage = 'en';
    } else {
      const vsLocale = vscode.env.language || '';
      this.currentLanguage = vsLocale.startsWith('bn') ? 'bn' : 'en';
    }
  }

  public setLanguage(lang: SupportedLanguage): void {
    this.currentLanguage = lang;
  }

  public getLanguage(): SupportedLanguage {
    return this.currentLanguage;
  }

  public t(): ILocaleStrings {
    return this.currentLanguage === 'bn' ? bnStrings : enStrings;
  }
}
