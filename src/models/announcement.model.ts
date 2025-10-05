import {Entity, model, property} from '@loopback/repository';

@model({settings: {strict: true}})
export class Announcement extends Entity {
  @property({type: 'string', id: true, generated: true})
  id?: string;

  // Basic Information
  @property({type: 'string', required: true})
  title: string;

  @property({type: 'string', required: true})
  content: string;

  @property({type: 'string'})
  category?: string;

  @property({type: 'string'})
  priority?: string;

  @property({type: 'string'})
  hall?: string;

  // Event Details
  @property({type: 'date'})
  eventDate?: string;

  @property({type: 'string'})
  eventTime?: string;

  @property({type: 'string'})
  expectedAttendees?: string;

  // Tags
  @property.array(String)
  tags?: string[];

  // Publishing
  @property({type: 'boolean', default: true})
  draft?: boolean;

  @property({type: 'boolean', default: false})
  published?: boolean;

  @property({
    type: 'string',
    jsonSchema: {nullable: true, format: 'date-time'},
  })
  publishedSchedule?: string | null;

  // Audit
  @property({type: 'string'})
  createdByName?: string;

  @property({type: 'string'})
  createdByEmail?: string;

  @property({type: 'date', defaultFn: 'now'})
  createdAt?: string;

  @property({type: 'date', defaultFn: 'now'})
  updatedAt?: string;

  constructor(data?: Partial<Announcement>) {
    super(data);
  }
}

export interface AnnouncementRelations {}
export type AnnouncementWithRelations = Announcement & AnnouncementRelations;
