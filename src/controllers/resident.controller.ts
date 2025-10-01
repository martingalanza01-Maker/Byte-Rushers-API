import {inject} from '@loopback/core';
import {repository} from '@loopback/repository';
import {get, HttpErrors, param, post, requestBody, Response, RestBindings} from '@loopback/rest';
import * as bcrypt from 'bcryptjs';
import {Resident} from '../models';
import {ResidentRepository} from '../repositories';
import {sendMailGmail} from '../services/mailer.service';

type CreateResidentRequest = Omit<Resident, 'id' | 'passwordHash' | 'createdAt'> & {password: string};

function normalizePhonePH(value: string): string {
  const digits = (value || '').replace(/\D+/g, '');
  if (!digits) return '';

  // Already E.164-like: 639XXXXXXXXX
  if (digits.startsWith('63')) return digits;

  // Common local formats
  if (digits.startsWith('09') && digits.length === 11) return '63' + digits.slice(1); // 09XXXXXXXXX
  if (digits.startsWith('0') && digits.length > 1) return '63' + digits.slice(1);     // 0-prefixed

  // 9XXXXXXXXX (10 digits starting with 9)
  if (digits.length === 10 && digits.startsWith('9')) return '63' + digits;

  // Fallback: prefix 63
  return '63' + digits;
}

const WEB_BASE_URL = process.env.WEB_BASE_URL || 'http://127.0.0.1:3000';
const API_BASE = process.env.APP_BASE_URL || 'http://127.0.0.1:3001';

export class ResidentController {
  constructor(
    @repository(ResidentRepository) private residentRepo: ResidentRepository,
  ) { }

  @get('/residents/exists', {
    responses: {
      '200': {
        description: 'Check if a resident email already exists',
        content: {'application/json': {schema: {type: 'object', properties: {exists: {type: 'boolean'}}}}},
      },
    },
  })
  async emailExists(
    @param.query.string('email') email: string,
  ): Promise<{exists: boolean}> {
    if (!email) throw new HttpErrors.BadRequest('email is required');
    const count = await this.residentRepo.count({email: email.toLowerCase().trim()});
    return {exists: count.count > 0};
  }

  @post('/residents', {
    responses: {
      '200': {
        description: 'Resident model instance',
        content: {'application/json': {schema: {'x-ts-type': Resident}}},
      },
    },
  })
  async createResident(
    @requestBody({
      content: {
        'application/json': {
          schema: {
            type: 'object',
            required: ['firstName', 'lastName', 'email', 'phone', 'password'],
            properties: {
              firstName: {type: 'string'},
              lastName: {type: 'string'},
              middleName: {type: 'string'},
              email: {type: 'string'},
              phone: {type: 'string'},
              birthDate: {type: 'string'},
              gender: {type: 'string'},
              civilStatus: {type: 'string'},
              houseNumber: {type: 'string'},
              street: {type: 'string'},
              purok: {type: 'string'},
              barangayHall: {type: 'string'},
              password: {type: 'string', minLength: 8},
            },
          },
        },
      },
    })
    body: CreateResidentRequest,
  ): Promise<Resident> {
    const email = body.email?.toLowerCase().trim();
    if (!email) throw new HttpErrors.UnprocessableEntity('Email is required');
    const exists = await this.residentRepo.count({email});
    if (exists.count > 0) {
      throw new HttpErrors.UnprocessableEntity('Email is already registered');
    }

    const phone = normalizePhonePH(body.phone || '');
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(body.password, salt);

    const token = (Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2)).slice(0, 48);
    const expires = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
    const resident = await this.residentRepo.create({
      firstName: body.firstName,
      lastName: body.lastName,
      middleName: body.middleName,
      email,
      phone,
      birthDate: body.birthDate,
      gender: body.gender,
      civilStatus: body.civilStatus,
      houseNumber: body.houseNumber,
      street: body.street,
      purok: body.purok,
      barangayHall: body.barangayHall,
      passwordHash,
      createdAt: new Date().toISOString(),
      emailVerified: false,
      verificationToken: token,
      verificationExpires: expires,
    });


    // Send verification email (best-effort)
    try {
      const verifyLink = `${API_BASE}/residents/verify?token=${encodeURIComponent(token)}`;
      await sendMailGmail({
        to: email,
        subject: 'Verify your email',
        html: `<p>Hi ${body.firstName || ''},</p>
           <p>Thanks for registering. Please verify your email by clicking the link below:</p>
           <p><a href="${verifyLink}" target="_blank" rel="noopener">Verify Email</a></p>
           <p>This link expires in 24 hours.</p>`
      });
    } catch (e) {
      // Do not block registration on email failure
      console.error('Verification email failed:', e);
    }
    return resident;
  }

  // Endpoint to (re)send verification email if needed
  @post('/residents/{id}/send-verification', {
    responses: {'204': {description: 'Verification email sent'}},
  })
  async sendVerification(@param.path.string('id') id: string): Promise<void> {
    const resident = await this.residentRepo.findById(id);
    if (!resident) throw new HttpErrors.NotFound('Resident not found');

    // Generate new token & expiry
    const token = (Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2)).slice(0, 48);
    const expires = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

    await this.residentRepo.updateById(id, {
      verificationToken: token,
      verificationExpires: expires,
      emailVerified: false,
    });

    const verifyLink = `${API_BASE}/residents/verify?token=${encodeURIComponent(token)}`;

    await sendMailGmail({
      to: resident.email?.toString() || '',
      subject: 'Verify your email',
      html: `<p>Hi ${resident.firstName || ''},</p>
             <p>Please verify your email by clicking the link below:</p>
             <p><a href="${verifyLink}" target="_blank" rel="noopener">Verify Email</a></p>
             <p>This link expires in 24 hours.</p>`
    });
  }

  @get('/residents/verify', {
    responses: {'200': {description: 'Email verified'}},
  })
  async verify(
    @param.query.string('token') token: string,
    @inject(RestBindings.Http.RESPONSE) response: Response
  ): Promise<object> {
    if (!token) throw new HttpErrors.BadRequest('token is required');
    const found = await this.residentRepo.findOne({where: {verificationToken: token}});
    if (!found) throw new HttpErrors.NotFound('Invalid token');
    const now = Date.now();
    const exp = found.verificationExpires ? new Date(found.verificationExpires).getTime() : 0;
    if (!exp || now > exp) throw new HttpErrors.Gone('Verification link has expired');
    await this.residentRepo.updateById(found.id!, {
      emailVerified: true,
      verificationToken: undefined,
      verificationExpires: undefined,
    });
    response.redirect(303, `${WEB_BASE_URL}/verify-email/success`);
    return {ok: true};
  }

@post('/residents/{id}/resend-verification', {
  responses: {'200': {description: 'Resent verification email'}},
})
async resendVerificationById(@param.path.string('id') id: string): Promise<{sent: boolean}> {
  const resident = await this.residentRepo.findById(id).catch(() => null);
  if (!resident) throw new HttpErrors.NotFound('Resident not found');
  if (resident.emailVerified) throw new HttpErrors.BadRequest('Email already verified');

  const token = (Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2)).slice(0, 48);
  const expires = new Date(Date.now() + 24*60*60*1000).toISOString();

  await this.residentRepo.updateById(id, {
    verificationToken: token,
    verificationExpires: expires,
    emailVerified: false,
  });

  const verifyLink = `${API_BASE}/residents/verify?token=${encodeURIComponent(token)}`;
  await sendMailGmail({
    to: resident.email?.toString() || '',
    subject: 'Verify your email',
    html: `<p>Hi ${resident.firstName || ''},</p>
           <p>Please verify your email by clicking the link below:</p>
           <p><a href="${verifyLink}" target="_blank" rel="noopener">Verify Email</a></p>
           <p>This link expires in 24 hours.</p>`
  });
  return {sent: true};
}

@post('/residents/resend-verification', {
  responses: {'200': {description: 'Resent verification email'}},
})
async resendVerificationByEmail(
  @requestBody({
    content: {'application/json': {schema: {type: 'object', required: ['email'], properties: {email: {type: 'string'}}}}}
  })
  body: {email: string}
): Promise<{sent: boolean}> {
  const email = body.email?.toLowerCase().trim();
  if (!email) throw new HttpErrors.BadRequest('email is required');
  const resident = await this.residentRepo.findOne({where: {email}});
  if (!resident) throw new HttpErrors.NotFound('Resident not found');
  if (resident.emailVerified) throw new HttpErrors.BadRequest('Email already verified');

  const token = (Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2)).slice(0, 48);
  const expires = new Date(Date.now() + 24*60*60*1000).toISOString();

  await this.residentRepo.updateById(resident.id!, {
    verificationToken: token,
    verificationExpires: expires,
    emailVerified: false,
  });

  const verifyLink = `${API_BASE}/residents/verify?token=${encodeURIComponent(token)}`;
  await sendMailGmail({
    to: email,
    subject: 'Verify your email',
    html: `<p>Hi ${resident.firstName || ''},</p>
           <p>Please verify your email by clicking the link below:</p>
           <p><a href="${verifyLink}" target="_blank" rel="noopener">Verify Email</a></p>
           <p>This link expires in 24 hours.</p>`
  });
  return {sent: true};
}
}
