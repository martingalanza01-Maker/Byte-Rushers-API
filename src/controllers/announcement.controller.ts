import {repository} from '@loopback/repository';
import {post, response, requestBody, getModelSchemaRef, get, param} from '@loopback/rest';
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
      // Publish now
      body.published = true;
      body.publishedSchedule = null;
      body.draft = false;
    } else if (schedule) {
      // Schedule publish
      body.published = false;
      body.publishedSchedule = schedule;
      body.draft = false;
    } else {
      // Treat as draft (not published, not scheduled)
      body.published = false;
      body.publishedSchedule = null;
      body.draft = true;
    }

    body.createdAt = new Date().toISOString() as any;
    body.updatedAt = body.createdAt;

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
}
