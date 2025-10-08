// src/observers/publisher.observer.ts
import {lifeCycleObserver, LifeCycleObserver} from '@loopback/core';
import {repository} from '@loopback/repository';
import {AnnouncementRepository} from '../repositories';

@lifeCycleObserver('server')
export class PublisherObserver implements LifeCycleObserver {
  private timer?: NodeJS.Timeout;

  constructor(
    @repository(AnnouncementRepository)
    private announcementRepo: AnnouncementRepository,
  ) {}

  start(): void {
    // run every 60s; make it configurable if you want
    this.timer = setInterval(async () => {
      try {
        await this.announcementRepo.updateAll(
          {
            published: true,
          },
          {
            and: [
              {published: false},
              {publishedSchedule: {neq: null}},
              // publishedSchedule is typed as string, so compare with ISO string
              {publishedSchedule: {lte: new Date()}},
            ],
          },
        );
      } catch (e) {
        console.error('[PublisherObserver] update failed:', e);
      }
    }, 60_000);
  }

  stop(): void {
    if (this.timer) clearInterval(this.timer);
  }
}
