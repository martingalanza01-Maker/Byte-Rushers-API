import {inject} from '@loopback/core';
import {DefaultCrudRepository} from '@loopback/repository';
import {MongodbDataSource} from '../datasources';
import {Submission, SubmissionRelations} from '../models';

export class SubmissionRepository extends DefaultCrudRepository<
  Submission,
  typeof Submission.prototype.id,
  SubmissionRelations
> {
  constructor(
    @inject('datasources.mongodb') dataSource: MongodbDataSource,
  ) {
    super(Submission, dataSource);
  }
}
