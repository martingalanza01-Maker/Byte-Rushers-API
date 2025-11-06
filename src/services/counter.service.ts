import {inject} from '@loopback/core';
import {MongodbDataSource} from '../datasources';

export class CounterService {
  constructor(@inject('datasources.mongodb') private mongoDs: MongodbDataSource) {}

  async next(key: string): Promise<number> {
    const anyDs: any = this.mongoDs as any;
    const db = anyDs?.connector?.db;
    if (!db) throw new Error('MongoDB connector not initialized');
    const res = await db.collection('counters').findOneAndUpdate(
      { _id: key },
      { $inc: { seq: 1 } },
      { upsert: true, returnDocument: 'after' }
    );
    return res.value?.seq ?? 1;
  }
}
