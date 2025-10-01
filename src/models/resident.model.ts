import {Entity, model, property} from '@loopback/repository';

@model({settings: {strict: true}})
export class Resident extends Entity {
  @property({type: 'string', id: true, generated: true})
  id?: string;

  // Personal Information
  @property({type: 'string', required: true})
  firstName: string;

  @property({type: 'string', required: true})
  lastName: string;

  @property({type: 'string'})
  middleName?: string;

  @property({type: 'string', required: true, index: {unique: true}})
  email: string;

  @property({type: 'string', required: true})
  phone: string;

  @property({type: 'string'})
  birthDate?: string;

  @property({type: 'string'})
  gender?: string;

  @property({type: 'string'})
  civilStatus?: string;

  // Address
  @property({type: 'string'})
  houseNumber?: string;

  @property({type: 'string'})
  street?: string;

  @property({type: 'string'})
  purok?: string;

  @property({type: 'string'})
  barangayHall?: string;

  // Account
  @property({type: 'boolean', default: false})
  emailVerified?: boolean;

  @property({type: 'string'})
  verificationToken?: string;

  @property({type: 'date'})
  verificationExpires?: string;

  // Account
  @property({type: 'string'})
  passwordHash?: string;

  @property({type: 'date', default: () => new Date()})
  createdAt?: string;

  constructor(data?: Partial<Resident>) {
    super(data);
  }
}

export interface ResidentRelations {
  // describe navigational properties here
}

export type ResidentWithRelations = Resident & ResidentRelations;
