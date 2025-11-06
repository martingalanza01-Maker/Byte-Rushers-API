import {inject} from '@loopback/core';
import {MongodbDataSource} from '../datasources';

type Provider = 'mock' | 'sms';

export class SmsService {
  private provider: Provider;
  private logsDir: string;

  constructor(@inject('datasources.mongodb') private mongoDs: MongodbDataSource) {
    this.provider = (process.env.SMS_PROVIDER as Provider) || 'mock';
    this.logsDir = require('path').resolve(__dirname, '../../logs');
  }

  async send(to: string, body: string) {
    if (this.provider === 'mock') return this.mockSend(to, body);
    if (this.provider === 'sms') return this.smsSend(to, body);
  }

  private async mockSend(to: string, body: string) {
    const fs = await import('fs'); const path = await import('path');
    try {
      if (!fs.existsSync(this.logsDir)) fs.mkdirSync(this.logsDir, {recursive: true});
      const entry = {to, body, at: new Date().toISOString(), provider: 'mock'};
      const file = path.resolve(this.logsDir, `sms-${Date.now()}.json`);
      fs.writeFileSync(file, JSON.stringify(entry, null, 2), 'utf-8');
      try { const db = (this.mongoDs as any)?.connector?.db; if (db) await db.collection('sms_logs').insertOne(entry);} catch {}
      console.log('[SmsService][MOCK] SMS logged:', entry);
    } catch (e) { console.warn('[SmsService] mock send failed:', e); }
  }

  private async smsSend(to: string, body: string) {
    const baseUrl = process.env.SMS_BASE_URL || 'https://api.httpsms.com';
    const apiKey = process.env.SMS_API_KEY || 'uk_pS3m5Vztk0cRX9mguWvsvbEAezIPRtMVwY9wK7e25hFWyy5I29n6pQUVy2zC7d2S';
    const from = process.env.SMS_SENDER || '+639943461432';
    if (!apiKey) { console.warn('[SmsService] SMS_API_KEY not set, skipping SMS.'); return; }
    const url = baseUrl.replace(/\/$/, '') + '/v1/messages/send';
    const payload = {content: body,from, to: to.replace(/^\+/, '')};
    try {
      const fetchFn: any = (global as any).fetch || (await import('node-fetch')).default;
      const res = await fetchFn(url, { method: 'POST', headers: { 'x-api-key': apiKey, 'Content-Type': 'application/json', 'Accept': 'application/json' }, body: JSON.stringify(payload) });
      if (!res.ok) { const msg = await res.text(); console.warn('[SmsService][SMS] Error:', res.status, msg); }
    } catch (e) { console.warn('[SmsService][SMS] Send failed:', e); }
  }
}
