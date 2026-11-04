import * as https from 'https';
import * as http from 'http';
import * as url from 'url';
import { SecurityVault } from '../core/security-vault';

export interface IAlertPayload {
  title: string;
  moduleNumber?: number;
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'INFO';
  message: string;
  filePath?: string;
  timestamp: string;
  metadata?: Record<string, any>;
}

export class WebhookDispatcherService {
  private static instance: WebhookDispatcherService;

  private constructor() {}

  public static getInstance(): WebhookDispatcherService {
    if (!WebhookDispatcherService.instance) {
      WebhookDispatcherService.instance = new WebhookDispatcherService();
    }
    return WebhookDispatcherService.instance;
  }

  /**
   * Sanitizes payload and dispatches alert to a configured webhook URL
   */
  public async dispatchAlert(
    webhookUrl: string,
    alert: IAlertPayload
  ): Promise<{ success: boolean; message: string }> {
    if (!webhookUrl || !webhookUrl.startsWith('http')) {
      return { success: false, message: 'Invalid or missing webhook URL' };
    }

    // Redact all sensitive tokens or credentials from message before network transmission
    const sanitizedMsg = SecurityVault.getInstance().maskSecrets(alert.message);
    const sanitizedTitle = SecurityVault.getInstance().maskSecrets(alert.title);

    const payload = JSON.stringify({
      text: `🛡️ *[Antigravity Alert - ${alert.severity}]* ${sanitizedTitle}\n${sanitizedMsg}`,
      severity: alert.severity,
      moduleNumber: alert.moduleNumber,
      timestamp: alert.timestamp || new Date().toISOString(),
      details: alert.metadata || {},
    });

    return new Promise(resolve => {
      try {
        const parsedUrl = url.parse(webhookUrl);
        const isHttps = parsedUrl.protocol === 'https:';
        const client = isHttps ? https : http;

        const options = {
          hostname: parsedUrl.hostname,
          port: parsedUrl.port || (isHttps ? 443 : 80),
          path: parsedUrl.path,
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(payload),
          },
          timeout: 5000,
        };

        const req = client.request(options, res => {
          if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
            resolve({ success: true, message: 'Alert dispatched successfully' });
          } else {
            resolve({ success: false, message: `Webhook responded with status ${res.statusCode}` });
          }
        });

        req.on('error', err => {
          resolve({ success: false, message: err.message || 'Network request failed' });
        });

        req.on('timeout', () => {
          req.destroy();
          resolve({ success: false, message: 'Webhook request timed out' });
        });

        req.write(payload);
        req.end();
      } catch (err: any) {
        resolve({ success: false, message: err.message || 'Failed to dispatch alert' });
      }
    });
  }
}
