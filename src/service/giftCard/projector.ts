import { runProjector } from "@keix/message-store-client";
import { EventCard, EventTypeCard } from "./types";

export async function runCardExistProjector(id: string): Promise<boolean> {
  function reducer(prev: boolean, next: EventCard) {
    if (next.type === EventTypeCard.GIFT_CARD_ADDED) {
      return true;
    } else if (next.type === EventTypeCard.GIFT_CARD_REMOVED) {
      return false;
    } else {
      return prev;
    }
  }
  return runProjector({ streamName: `giftCard-${id}` }, reducer, false);
}

export async function runVerifyAmountProjector(
  id: string,
  amount: number
): Promise<boolean> {
  function reducer(prev: boolean, next: EventCard) {
    if (
      next.type === EventTypeCard.GIFT_CARD_ADDED ||
      next.type === EventTypeCard.GIFT_CARD_UPDATED
    ) {
      return next.data.amounts.includes(amount);
    } else {
      return prev;
    }
  }
  return runProjector({ streamName: `giftCard-${id}` }, reducer, false);
}

export async function runVerifyPendingProjector(id: string): Promise<boolean> {
  function reducer(prev: boolean, next: EventCard) {
    if (next.type === EventTypeCard.GIFT_CARD_REDEEM_PENDING) {
      return true;
    } else {
      return false;
    }
  }
  return runProjector(
    { streamName: `giftCardTransaction-${id}` },
    reducer,
    false
  );
}

export async function runVerifyProcessingProjector(
  id: string
): Promise<boolean> {
  function reducer(prev: boolean, next: EventCard) {
    if (next.type === EventTypeCard.GIFT_CARD_REDEEM_PROCESSING) {
      return true;
    } else {
      return false;
    }
  }
  return runProjector(
    { streamName: `giftCardTransaction-${id}` },
    reducer,
    false
  );
}

export async function runVerifyDeliveryProjector(id: string): Promise<boolean> {
  function reducer(prev: boolean, next: EventCard) {
    if (next.type === EventTypeCard.GIFT_CARD_REDEEM_SUCCEDED) {
      return true;
    } else {
      return false;
    }
  }
  return runProjector(
    { streamName: `giftCardTransaction-${id}` },
    reducer,
    false
  );
}

export async function runVerifyErrorProjector(id: string): Promise<boolean> {
  function reducer(prev: boolean, next: EventCard) {
    if (next.type === EventTypeCard.GIFT_CARD_REDEEM_FAILED) {
      return true;
    } else {
      return false;
    }
  }
  return runProjector(
    { streamName: `giftCardTransaction-${id}` },
    reducer,
    false
  );
}
