import {repository} from '@loopback/repository';
import {
  post,
  get,
  requestBody,
  response,
  getModelSchemaRef,
} from '@loopback/rest';
import {Submission} from '../models';
import {SubmissionRepository} from '../repositories';

export class SubmissionController {
  constructor(
    @repository(SubmissionRepository)
    public submissionRepository: SubmissionRepository,
  ) {}

  @post('/submissions')
  @response(200, {
    description: 'Submission model instance',
    content: {'application/json': {schema: getModelSchemaRef(Submission)}},
  })
  async create(
    @requestBody({
      content: {
        'application/json': {
          schema: getModelSchemaRef(Submission, {
            title: 'NewSubmission',
            exclude: ['id', 'createdAt'],
          }),
        },
      },
    })
    submission: Omit<Submission, 'id'>,
  ): Promise<Submission> {
    return this.submissionRepository.create(submission);
  }

  @get('/submissions')
  @response(200, {
    description: 'Array of Submission model instances',
    content: {
      'application/json': {
        schema: {
          type: 'array',
          items: getModelSchemaRef(Submission, {includeRelations: true}),
        },
      },
    },
  })
  async find(): Promise<Submission[]> {
    return this.submissionRepository.find({
      order: ['createdAt DESC'],
    });
  }
}
