
import {inject} from '@loopback/core';
import {get, patch, requestBody, RestBindings, HttpErrors} from '@loopback/rest';
import {UserRepository} from '../repositories/user.repository';
import {repository} from '@loopback/repository';
import * as jwt from 'jsonwebtoken';

const TOKEN_COOKIE = 'token';

export class UserProfileController {
  constructor(
    @repository(UserRepository) private userRepo: UserRepository,
    @inject(RestBindings.Http.REQUEST) private req: any,
  ) {}

  private readTokenFromCookie(req: any): string | null {
    const cookie = req.headers?.cookie || '';
    const m = cookie.match(new RegExp(`${TOKEN_COOKIE}=([^;]+)`));
    return m ? decodeURIComponent(m[1]) : null;
  }
  private jwtSecret() {
    return process.env.JWT_SECRET || 'dev-secret-change-me';
  }

  @get('/users/me')
  async me() {
    const token = this.readTokenFromCookie(this.req);
    if (!token) return {authenticated:false};
    let payload: any;
    try { payload = jwt.verify(token, this.jwtSecret()); } catch { return {authenticated:false}; }
    const user = await this.userRepo.findById(payload.sub).catch(()=>null);
    if (!user) return {authenticated:false};
    return {authenticated:true, user};
  }

  @patch('/users/me', {
    responses: { '200': { description: 'Updated profile' } }
  })
  async updateMe(
    @requestBody({
      required: true,
      content: {'application/json': { schema: {
        type: 'object',
        properties: {
          name: {type:'string'},
          phone: {type:'string'},
          occupation: {type:'string'},
          address: {type:'string'},
          civilStatus: {type:'string'},
          dateOfBirth: {type:'string'},
          emergencyContact: {type:'string'},
          emergencyPhone: {type:'string'},
          avatar: {type:'string'},
          hall: {type:'string'}
        }
      } } }
    }) body: any
  ){
    const token = this.readTokenFromCookie(this.req);
    if (!token) throw new HttpErrors.Unauthorized('Not authenticated');
    let payload: any;
    try { payload = jwt.verify(token, this.jwtSecret()); } catch { throw new HttpErrors.Unauthorized('Invalid token'); }
    const id = payload.sub as string;
    const allowed = ['name','phone','occupation','address','civilStatus','dateOfBirth','emergencyContact','emergencyPhone','avatar','hall'];
    const update: any = {};
    for (const k of allowed) if (k in body) update[k] = body[k];
    await this.userRepo.updateById(id, update);
    const user = await this.userRepo.findById(id);
    return { ok: true, user };
  }
}
