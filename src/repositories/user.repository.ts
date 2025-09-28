import {inject} from '@loopback/core';
import {DefaultCrudRepository} from '@loopback/repository';
import {User} from '../models/user.model';
import {MongodbDataSource} from '../datasources/mongodb.datasource';

export class UserRepository extends DefaultCrudRepository<
  User,
  typeof User.prototype.id
> {
  constructor(@inject('datasources.mongodb') dataSource: MongodbDataSource) {
    super(User, dataSource);
  }
}
