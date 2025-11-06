import {inject} from '@loopback/core';
import {get, Response, RestBindings} from '@loopback/rest';
import {repository} from '@loopback/repository';
import {FeedbackRepository} from '../repositories';

// Exported utils so we can test them without hitting the controller runtime
export function flattenForCsv(obj: Record<string, any>, prefix = ''): Record<string, any> {
  const out: Record<string, any> = {};
  for (const [k, v] of Object.entries(obj ?? {})) {
    const key = prefix ? `${prefix}.${k}` : k;
    if (v && typeof v === 'object' && !Array.isArray(v) && !(v instanceof Date)) {
      Object.assign(out, flattenForCsv(v as Record<string, any>, key));
    } else if (Array.isArray(v)) {
      out[key] = JSON.stringify(v);
    } else if (v instanceof Date) {
      out[key] = v.toISOString();
    } else if (v === null || v === undefined) {
      out[key] = '';
    } else {
      out[key] = v as any;
    }
  }
  return out;
}

export function toCsv(rows: Array<Record<string, any>>): string {
  if (!rows.length) return '"No data"';
  const flat = rows.map(r => flattenForCsv(r));
  const headers = Array.from(new Set(flat.flatMap(r => Object.keys(r))));
  const escape = (val: any) => {
    const s = String(val ?? '');
    // Escape quotes by doubling them; wrap in quotes if needed
    if (/[",]/.test(s)) return '"' + s.replace(/"/g, '""') + '"';
    return s;
  };
  const headerLine = headers.map(escape).join(',') + '\n';
  const lines = flat.map(r => headers.map(h => escape((r as any)[h])).join(',') + '\n');
  return [headerLine, ...lines].join('') + '';
}

export class FeedbackExportController {
  constructor(
    @repository(FeedbackRepository)
    private feedbackRepo: FeedbackRepository,
    @inject(RestBindings.Http.RESPONSE) private res: Response,
  ) {}

  @get('/feedbacks/export', {
    responses: {
      '200': {
        description: 'CSV export of all Feedback records',
        content: {'text/csv': {schema: {type: 'string', format: 'binary'}}},
      },
    },
  })
  async exportAll() {
    const feedback = await this.feedbackRepo.find();
    const csv = toCsv(feedback as unknown as Record<string, any>[]);

    const filename = `resident-feedback-${new Date().toISOString().slice(0, 10)}.csv`;
    this.res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    this.res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    this.res.status(200).send(csv);
    return this.res;
  }
}