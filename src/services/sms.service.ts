import {inject} from '@loopback/core';
import {MongodbDataSource} from '../datasources';

type Provider = 'mock' | 'infobip';

export class SmsService {
  private provider: Provider;
  private logsDir: string;

  constructor(@inject('datasources.mongodb') private mongoDs: MongodbDataSource) {
    this.provider = (process.env.SMS_PROVIDER as Provider) || 'mock';
    this.logsDir = require('path').resolve(__dirname, '../../logs');
  }

  async send(to: string, body: string) {
    if (this.provider === 'mock') return this.mockSend(to, body);
    if (this.provider === 'infobip') return this.infobipSend(to, body);
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

  private async infobipSend(to: string, body: string) {
    const baseUrl = process.env.INFOBIP_BASE_URL || 'https://ypn339.api.infobip.com';
    const apiKey = process.env.INFOBIP_API_KEY || '33afcafb3c3c1b3c6519e8fea8708d11-7dc29fcf-2864-400e-8d3d-5d3dbec33867';
    const from = process.env.INFOBIP_SENDER || 'ServiceSMS';
    if (!apiKey) { console.warn('[SmsService] INFOBIP_API_KEY not set, skipping SMS.'); return; }
    const url = baseUrl.replace(/\/$/, '') + '/sms/2/text/advanced';
    const payload = { messages: [ { destinations: [{ to: to.replace(/^\+/, '') }], from, text: body } ] };
    try {
      const fetchFn: any = (global as any).fetch || (await import('node-fetch')).default;
      const res = await fetchFn(url, { method: 'POST', headers: { 'Authorization': `App ${apiKey}`, 'Content-Type': 'application/json', 'Accept': 'application/json' }, body: JSON.stringify(payload) });
      if (!res.ok) { const msg = await res.text(); console.warn('[SmsService][Infobip] Error:', res.status, msg); }
    } catch (e) { console.warn('[SmsService][Infobip] Send failed:', e); }
  }
}
