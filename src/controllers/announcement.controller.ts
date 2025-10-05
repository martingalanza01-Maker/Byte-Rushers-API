import {repository} from '@loopback/repository';
import {
  post,
  response,
  requestBody,
  getModelSchemaRef,
  get,
  param,
  patch,
} from '@loopback/rest';
import {Announcement} from '../models';
import {AnnouncementRepository} from '../repositories';

export class AnnouncementController {
  constructor(
    @repository(AnnouncementRepository)
    public announcementRepository: AnnouncementRepository,
  ) {}

  @post('/announcements')
  @response(200, {
    description: 'Announcement model instance',
    content: {'application/json': {schema: getModelSchemaRef(Announcement)}},
  })
  async create(
    @requestBody({
      content: {
        'application/json': {
          schema: getModelSchemaRef(Announcement, {title: 'NewAnnouncement', partial: true}),
        },
      },
    })
    body: Partial<Announcement>,
  ): Promise<Announcement> {
    const schedule = body.publishedSchedule ?? null;

    if (body.published === true) {
      body.published = true;
      body.publishedSchedule = null;
      body.draft = false;
    } else if (schedule) {
      body.published = false;
      body.publishedSchedule = schedule;
      body.draft = true; // published=false => draft under your rule
    } else {
      body.published = false;
      body.publishedSchedule = null;
      body.draft = true;
    }

    const nowIso = new Date().toISOString() as any;
    body.createdAt = nowIso;
    body.updatedAt = nowIso;

    return this.announcementRepository.create(body as Announcement);
  }

  @get('/announcements/{id}')
  @response(200, {
    description: 'Get announcement by id',
    content: {'application/json': {schema: getModelSchemaRef(Announcement)}},
  })
  async findById(@param.path.string('id') id: string): Promise<Announcement> {
    return this.announcementRepository.findById(id);
  }

  @get('/announcements/drafts')
  @response(200, {
    description: 'List draft announcements (published != true)',
    content: {
      'application/json': {
        schema: {type: 'array', items: getModelSchemaRef(Announcement, {includeRelations: false})},
      },
    },
  })
  async listDrafts(): Promise<Announcement[]> {
    return this.announcementRepository.find({
      // <-- Key change: include false or missing
      where: {published: {neq: true}},
      order: ['updatedAt DESC'],
      // You can keep fields if you want, but returning full objects is safest for UI:
      // fields: { id: true, title: true, updatedAt: true, publishedSchedule: true, ... }
    });
  }

  @patch('/announcements/{id}')
  @response(200, {
    description: 'Update announcement',
    content: {'application/json': {schema: getModelSchemaRef(Announcement)}},
  })
  async update(
    @param.path.string('id') id: string,
    @requestBody({
      content: {
        'application/json': {
          schema: getModelSchemaRef(Announcement, {title: 'UpdateAnnouncement', partial: true}),
        },
      },
    })
    body: Partial<Announcement>,
  ): Promise<Announcement> {
    const updates: Partial<Announcement> = {...body};
    const hasPublished = Object.prototype.hasOwnProperty.call(body, 'published');
    const hasSchedule = Object.prototype.hasOwnProperty.call(body, 'publishedSchedule');

    if (hasPublished && body.published === true) {
      updates.published = true;
      updates.publishedSchedule = null;
      updates.draft = false;
    } else if (hasSchedule && body.publishedSchedule) {
      updates.published = false;
      updates.publishedSchedule = body.publishedSchedule!;
      updates.draft = true;
    } else if (hasPublished && body.published === false && !hasSchedule) {
      updates.published = false;
      updates.publishedSchedule = null;
      updates.draft = true;
    }

    updates.updatedAt = new Date().toISOString() as any;

    await this.announcementRepository.updateById(id, updates);
    return this.announcementRepository.findById(id);
  }
}
