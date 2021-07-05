import {
  subscribe,
  Message,
  readLastMessage,
  combineSubscriber,
} from "@keix/message-store-client";
import { EventCard, EventTypeCard } from "../../service/giftCard/types";
import { Client } from "@elastic/elasticsearch";

const elasticClient = new Client({ node: "https://dev.elastic.keix.com" });

const ELASTICDBNAME = "giftcarddaniele";

export async function getCardAmount(idCard: string) {
  let res = await elasticClient.get({
    index: ELASTICDBNAME,
    id: idCard,
  });
  return res.body._source.amount;
}

export async function getCard(idCard: string) {
  try {
    let res = await elasticClient.get({
      index: ELASTICDBNAME,
      id: idCard,
    });
    return res.body._source;
  } catch (err) {
    return null;
  }
}

async function handler(event: EventCard) {
  switch (event.type) {
    case EventTypeCard.GIFT_CARD_ADDED: {
      return await elasticClient.index({
        index: ELASTICDBNAME,
        id: event.data.id,
        refresh: true,
        body: {
          id: event.data.id,
          name: event.data.name,
          description: event.data.description,
          image_url: event.data.image_url,
          amount: event.data.amounts,
        },
      });
    }
    case EventTypeCard.GIFT_CARD_REMOVED: {
      return await elasticClient.delete({
        index: ELASTICDBNAME,
        id: event.data.id,
      });
    }
    case EventTypeCard.GIFT_CARD_UPDATED: {
      return await elasticClient.update({
        index: ELASTICDBNAME,
        id: event.data.id,
        body: {
          doc: { id: event.data.id, amount: event.data.amounts },
        },
      });
    }
  }
}

export async function run() {
  return combineSubscriber(
    subscribe(
      {
        streamName: "giftCard",
      },
      handler
    )
  );
}
