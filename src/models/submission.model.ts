import {Entity, model, property} from '@loopback/repository';

@model({settings: {strict: true}})
export class Submission extends Entity {
  @property({type: 'string', id: true, generated: true})
  id?: string;

  @property({type: 'string', required: true})
  name: string;

  @property({type: 'string', required: true})
  email: string;

  @property({type: 'string'})
  phone?: string;

  @property({type: 'string'})
  subject?: string;

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
