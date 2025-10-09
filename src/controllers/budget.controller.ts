import {inject} from '@loopback/core';
import {
  get,
  operation,
  post,
  requestBody,
  response,
  RestBindings,
  Response,
  param,
} from '@loopback/rest';
import multer from 'multer';
import path from 'path';
import fs from 'fs';

const STORAGE_DIR = path.resolve(process.cwd(), '../upload/storage');
const ALT_STORAGE_DIR = path.resolve(__dirname, '../upload/storage'); // fallback (older uploads)
const BUDGET_FILE_NAME = 'budget-transparency.pdf';
const PRIMARY_PATH = path.join(STORAGE_DIR, BUDGET_FILE_NAME);
const ALT_PATH = path.join(ALT_STORAGE_DIR, BUDGET_FILE_NAME);

export class BudgetController {
  constructor(@inject(RestBindings.Http.RESPONSE) private res: Response) {}

  @post('/budget-transparency/upload')
  @response(200, {
    description: 'Upload/overwrite the Budget Transparency PDF',
    content: {
      'application/json': {
        schema: {type: 'object', properties: {ok: {type: 'boolean'}, message: {type: 'string'}}},
      },
    },
  })
  async uploadBudgetPdf(
    @requestBody.file()
    req: any,
  ): Promise<object> {
    fs.mkdirSync(STORAGE_DIR, {recursive: true});

    const storage = multer.diskStorage({
      destination: (_req, _file, cb) => cb(null, STORAGE_DIR),
      filename: (_req, _file, cb) => cb(null, BUDGET_FILE_NAME),
    });

    const upload = multer({
      storage,
      fileFilter: (_r, file, cb) => {
        if (file.mimetype !== 'application/pdf') return cb(new Error('Only PDF files are allowed'));
        cb(null, true);
      },
      limits: {fileSize: 20 * 1024 * 1024}, // 20MB
    }).single('file');

    await new Promise<void>((resolve, reject) => {
      upload(req, this.res, (err: any) => (err ? reject(err) : resolve()));
    });

    return {ok: true, message: 'Budget Transparency Document uploaded successfully.'};
  }

  /** Resolve file path with backward compatibility */
  private resolveFilePath(): string | null {
    const exists = (p: string) => {
      try { return fs.existsSync(p); } catch { return false; }
    };
    if (exists(PRIMARY_PATH)) return PRIMARY_PATH;
    if (exists(ALT_PATH)) return ALT_PATH;
    return null;
  }

  @operation('head', '/budget-transparency/download')
  @response(200, {description: 'HEAD check for Budget Transparency PDF'})
  async headDownload(): Promise<void> {
    const filePath = this.resolveFilePath();
    if (!filePath) {
      this.res.status(404).end();
      return;
    }
    const stat = fs.statSync(filePath);
    this.res.setHeader('Content-Type', 'application/pdf');
    this.res.setHeader('Content-Length', stat.size.toString());
    this.res.setHeader('Last-Modified', stat.mtime.toUTCString());
    this.res.setHeader('Accept-Ranges', 'bytes');
    // A light cache helps browsers start rendering faster; tune as you wish
    this.res.setHeader('Cache-Control', 'public, max-age=3600, immutable');
    this.res.status(200).end();
  }

  @get('/budget-transparency/download')
  @response(200, {
    description: 'Download (or preview) the Budget Transparency PDF',
    content: {'application/pdf': {schema: {type: 'string', format: 'binary'}}},
  })
  async download(
    @param.query.string('dl') dl?: string, // pass ?dl=1 to force download
  ): Promise<void> {
    const filePath = this.resolveFilePath();
    if (!filePath) {
      this.res.status(404).json({ok: false, message: 'Budget Transparency Document not found.'});
      return;
    }

    const stat = fs.statSync(filePath);
    const forceDownload = dl === '1' || dl === 'true';

    this.res.setHeader('Content-Type', 'application/pdf');
    this.res.setHeader(
      'Content-Disposition',
      `${forceDownload ? 'attachment' : 'inline'}; filename="${BUDGET_FILE_NAME}"`
    );
    this.res.setHeader('Content-Length', stat.size.toString());
    this.res.setHeader('Last-Modified', stat.mtime.toUTCString());
    this.res.setHeader('Accept-Ranges', 'bytes');
    this.res.setHeader('Cache-Control', 'public, max-age=3600, immutable');

    // Stream it (starts immediately)
    const stream = fs.createReadStream(filePath);
    // Make sure headers go out ASAP
    // @ts-ignore (flushHeaders is available on Express Response)
    if (typeof (this.res as any).flushHeaders === 'function') (this.res as any).flushHeaders();

    stream.on('error', () => {
      if (!this.res.headersSent) this.res.status(500);
      this.res.end();
    });
    stream.pipe(this.res);
  }
}
