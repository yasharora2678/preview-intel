import { Injectable } from '@nestjs/common';
import { OutBoxStatus } from 'src/domain/outbox-message/enums/outbox-message.enum';
import { OutboxMessage } from 'src/domain/outbox-message/outbox-message.entity';
import { DataSource, Repository } from 'typeorm';

@Injectable()
export class OutboxMessageRepository extends Repository<OutboxMessage> {
  constructor(dataSource: DataSource) {
    super(OutboxMessage, dataSource.createEntityManager());
  }
  //   createOutboxPayloadFromEvent = (
  //     outbox_message: any,
  //   ) => {

  //     const messageType = outbox_message.getType();
  //     const { exchange, routingKey } = MessageDestinationService.get(messageType);

  //     return {
  //       message_id: outbox_message.getId(),
  //       type: messageType,
  //       exchange: exchange,
  //       routing_key: routingKey,
  //       properties: outbox_message.getProperties(),
  //       headers: outbox_message.getHeaders(),
  //       body: outbox_message.getPayload(),
  //     };
  //   };

  async findByDeliveryId(deliveryId: string) {
    return await this.findOne({
      where: { delivery_id: deliveryId },
    });
  }

  async storeOutboxMessage(outbox_message: any) {
    return await this.save(outbox_message);
  }

  async storeOutboxMessages(outboxMessages: any) {
    // const payloads = outboxMessages.map((msg) =>
    //   this.createOutboxPayloadFromEvent(msg),
    // );
    return await this.save(outboxMessages);
  }

  async getUnsentMessages(limit: number) {
    const [rows] = await this.findAndCount({
      where: { status: OutBoxStatus.PENDING },
      order: { created_at: 'ASC' },
      take: limit,
    });
    return rows;
  }
}
