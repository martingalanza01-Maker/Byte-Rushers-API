import {inject} from '@loopback/core';
import {DefaultCrudRepository} from '@loopback/repository';
import {MongodbDataSource} from '../datasources';
import {Resident, ResidentRelations} from '../models';

export class ResidentRepository extends DefaultCrudRepository<
  Resident,
  typeof Resident.prototype.id,
  ResidentRelations
> {
  constructor(
    @inject('datasources.mongodb') dataSource: MongodbDataSource,
  ) {
    super(Resident, dataSource);
  }
}
