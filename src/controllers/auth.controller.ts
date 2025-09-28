import {repository} from '@loopback/repository';
import {post, requestBody, get, Response, RestBindings} from '@loopback/rest';
import {inject} from '@loopback/core';
import {UserRepository} from '../repositories/user.repository';
import {User} from '../models/user.model';
import * as bcrypt from 'bcryptjs';
import * as jwt from 'jsonwebtoken';

const TOKEN_COOKIE = 'token';

export class AuthController {
  constructor(
    @repository(UserRepository) private userRepo: UserRepository,
    @inject(RestBindings.Http.RESPONSE) private res: Response,
  ) {}

  @post('/auth/register')
  async register(
    @requestBody({
      required: true,
      content: {'application/json': { schema: {
        type: 'object',
        required: ['email','password'],
        properties: {
          email: {type:'string', format:'email'},
          password: {type:'string', minLength:6},
          firstName: {type:'string'},
          lastName: {type:'string'},
          middleName: {type:'string'},
          phone: {type:'string'},
          birthDate: {type:'string'},
          gender: {type:'string'},
          civilStatus: {type:'string'},
          houseNumber: {type:'string'},
          street: {type:'string'},
          purok: {type:'string'},
          barangayHall: {type:'string'}
        }
      }}}})
    body: any,
  ) {
    const found = await this.userRepo.findOne({ where: { email: body.email } });
    if (found) return { ok: false, message: 'Email already in use' };
    const hash = await bcrypt.hash(body.password, 10);
    const user = await this.userRepo.create({
      email: body.email,
      password: hash,
      firstName: body.firstName,
      lastName: body.lastName,
      middleName: body.middleName,
      phone: body.phone,
      birthDate: body.birthDate,
      gender: body.gender,
      civilStatus: body.civilStatus,
      houseNumber: body.houseNumber,
      street: body.street,
      purok: body.purok,
      barangayHall: body.barangayHall,
    });
    const token = this.signToken(user);
    this.setAuthCookie(token);
    return { ok: true, user: { id: user.id, email: user.email, firstName: user.firstName, lastName: user.lastName } };
  }

  @post('/auth/login')
  async login(
    @requestBody({
      required: true,
      content: {'application/json': { schema: {
        type: 'object',
        required: ['email','password'],
        properties: { email: {type:'string', format:'email'}, password: {type:'string'} }
      }}}})
    body: {email: string; password: string},
  ) {
    const user = await this.userRepo.findOne({ where: { email: body.email } });
    if (!user) return { ok: false, message: 'Invalid credentials' };
    const ok = await bcrypt.compare(body.password, user.password);
    if (!ok) return { ok: false, message: 'Invalid credentials' };
    const token = this.signToken(user);
    this.setAuthCookie(token);
    return { ok: true, user: { id: user.id, email: user.email, firstName: user.firstName, lastName: user.lastName } };
  }

  @post('/auth/logout')
  async logout() {
    this.clearAuthCookie();
    return { ok: true };
  }

  @get('/auth/me')
  async me(@inject(RestBindings.Http.REQUEST) req: any) {
    const token = this.readTokenFromCookie(req);
    if (!token) return { authenticated: false };
    try {
      const payload = jwt.verify(token, this.jwtSecret()) as any;
      const user = await this.userRepo.findById(payload.sub).catch(() => null);
      if (!user) return { authenticated: false };
      return { authenticated: true, user: { id: user.id, email: user.email, firstName: user.firstName, lastName: user.lastName } };
    } catch {
      return { authenticated: false };
    }
  }

  private signToken(user: User) {
    const payload = { sub: user.id, email: user.email };
    return jwt.sign(payload, this.jwtSecret(), { expiresIn: '7d' });
  }

  private jwtSecret() { return process.env.JWT_SECRET || 'dev-secret-change-me'; }

  private setAuthCookie(token: string) {
    const isProd = process.env.NODE_ENV === 'production';
    const cookie = [
      `${TOKEN_COOKIE}=${token}`,
      'Path=/',
      'HttpOnly',
      isProd ? 'SameSite=None; Secure' : 'SameSite=Lax',
      'Max-Age=604800',
    ].join('; ');
    this.res.setHeader('Set-Cookie', cookie);
  }

  private clearAuthCookie() {
    const isProd = process.env.NODE_ENV === 'production';
    const cookie = [
      `${TOKEN_COOKIE}=`,
      'Path=/',
      'HttpOnly',
      isProd ? 'SameSite=None; Secure' : 'SameSite=Lax',
      'Max-Age=0',
    ].join('; ');
    this.res.setHeader('Set-Cookie', cookie);
  }

  private readTokenFromCookie(req: any): string | null {
    const header: string = req.headers['cookie'] || '';
    const parts = header.split(';').map((s: string) => s.trim());
    for (const p of parts) if (p.startsWith(TOKEN_COOKIE + '=')) return p.substring(TOKEN_COOKIE.length + 1);
    return null;
  }
}
