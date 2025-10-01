import {repository} from '@loopback/repository';
import {post, get, requestBody, param, HttpErrors} from '@loopback/rest';
import {Resident} from '../models';
import {ResidentRepository} from '../repositories';
import * as bcrypt from 'bcryptjs';

type CreateResidentRequest = Omit<Resident, 'id'|'passwordHash'|'createdAt'> & {password: string};

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

export class ResidentController {
  constructor(
    @repository(ResidentRepository) private residentRepo: ResidentRepository,
  ) {}

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
            required: ['firstName','lastName','email','phone','password'],
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
    });

    return resident;
  }
}
