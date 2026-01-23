import {
  EventSubscriber,
  EntitySubscriberInterface,
  InsertEvent,
  UpdateEvent,
  RemoveEvent,
} from 'typeorm';
import { Application } from '../entities/application.entity';
import { Offer } from '../entities/offer.entity';

@EventSubscriber()
export class ApplicationSubscriber implements EntitySubscriberInterface<Application> {

  listenTo() {
    return Application;
  }

  async afterInsert(event: InsertEvent<Application>) {
    if (event.entity.accepted) {
      await event.manager.increment(Offer, { id: event.entity.offerId }, 'takenSeats', 1);
    }
  }

  async afterUpdate(event: UpdateEvent<Application>) {
    if (!event.entity || !event.databaseEntity) return;

    const before = event.databaseEntity.accepted;
    const after = event.entity.accepted;

    if (!before && after) {
      await event.manager.increment(Offer, { id: event.entity.offerId }, 'takenSeats', 1);
    }

    if (before && !after) {
      await event.manager.decrement(Offer, { id: event.entity.offerId }, 'takenSeats', 1);
    }
  }

  async afterRemove(event: RemoveEvent<Application>) {
    if (event.databaseEntity?.accepted) {
      await event.manager.decrement(Offer, { id: event.databaseEntity.offerId }, 'takenSeats', 1);
    }
  }
}
