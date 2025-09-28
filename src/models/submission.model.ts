import {Entity, model, property} from '@loopback/repository';

@model({settings: {strict: true}})
export class Submission extends Entity {
  @property({type: 'string', id: true, generated: true})
  id?: string;

  @property({type: 'string', required: true})
  name: string;

  // Complaint category (e.g., Noise, Roads…)
  @property({type: 'string'})
  type?: string;

  @property({type: 'string'})
  priority?: string;

  @property({type: 'string'})
  complaintId: string;

  @property({type: 'string', required: true})
  email: string;

  @property({type: 'string', required: true})
  submissionType: string;

  @property({type: 'boolean'})
  smsNotifications?: boolean;

  @property({type: 'string'})
  phone?: string;

  @property({type: 'string'})
  address?: string;

  // ✅ Newly added — used by controller payload
  @property({type: 'string'})
  location?: string;

  // ✅ Newly added — used by controller payload
  @property({type: 'string'})
  hall?: string;

  // ✅ Newly added — used by controller payload
  @property({type: 'boolean'})
  anonymous?: boolean;

  @property({type: 'string'})
  evidenceUrl?: string;

  @property({type: 'string'})
  subject?: string;

  // (Your model had this; controller doesn’t set it, but it’s fine to keep)
  @property({type: 'string'})
  category?: string;

  @property({type: 'string', required: true})
  message: string;

  @property({type: 'boolean', default: false})
  urgent?: boolean;

  @property({type: 'date', defaultFn: 'now'})
  createdAt?: string;

  constructor(data?: Partial<Submission>) {
    super(data);
  }
}

export interface SubmissionRelations {
  // describe navigational properties here
}

export type SubmissionWithRelations = Submission & SubmissionRelations;
