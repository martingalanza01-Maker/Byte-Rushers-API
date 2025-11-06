import {inject} from '@loopback/core';
import {DefaultCrudRepository} from '@loopback/repository';
import {MongodbDataSource} from '../datasources';
import {Announcement, AnnouncementRelations} from '../models';

export class AnnouncementRepository extends DefaultCrudRepository<
  Announcement,
  typeof Announcement.prototype.id,
  AnnouncementRelations
> {
  constructor(
    @inject('datasources.mongodb') dataSource: MongodbDataSource,
  ) {
    super(Announcement, dataSource);
  }
}
