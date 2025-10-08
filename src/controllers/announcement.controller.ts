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

  // Drafts (anything not published, includes scheduled)
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
      where: {published: {neq: true}, publishedSchedule: {eq: null}},
      order: ['updatedAt DESC'],
    });
  }

  // Scheduled (not published but with schedule)
  @get('/announcements/scheduled')
  @response(200, {
    description: 'List scheduled announcements (published=false AND publishedSchedule present)',
    content: {
      'application/json': {
        schema: {type: 'array', items: getModelSchemaRef(Announcement, {includeRelations: false})},
      },
    },
  })
  async listScheduled(): Promise<Announcement[]> {
    return this.announcementRepository.find({
      where: {and: [{published: false}, {publishedSchedule: {neq: undefined}}]},
      order: ['publishedSchedule ASC'],
    });
  }

  // ✅ NEW: Published only
  @get('/announcements/published')
  @response(200, {
    description: 'List published announcements (published = true), newest first',
    content: {
      'application/json': {
        schema: {type: 'array', items: getModelSchemaRef(Announcement, {includeRelations: false})},
      },
    },
  })
  async listPublished(): Promise<Announcement[]> {
    return this.announcementRepository.find({
      where: {published: true},
      order: ['updatedAt DESC'],
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
    body.updatedAt = new Date().toISOString() as any;
    await this.announcementRepository.updateById(id, body);
    return this.announcementRepository.findById(id);
  }
}
