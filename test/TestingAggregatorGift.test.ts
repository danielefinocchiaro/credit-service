import { testUtils } from "@keix/message-store-client";
import { v4 } from "uuid";

import {
  getCard,
  getCardAmount,
  run,
} from "../src/aggregator/giftCard/aggregator";
import { EventTypeCard, EventCard } from "../src/service/giftCard/types";

let stop: () => void | null = () => null;
afterEach(() => {
  stop();
});

it("should return amounts of a card", async () => {
  let idCard = v4();
  testUtils.setupMessageStore([
    {
      type: EventTypeCard.GIFT_CARD_ADDED,
      stream_name: "giftCard-" + idCard,
      data: {
        id: idCard,
        name: "Amazon",
        description: "Carta per comprarti il frigo",
        image_url: "https://img.it",
        amounts: [5, 10, 20, 30, 50],
      },
    },
  ]);

  stop = await run();

  await testUtils.waitForExpect(async () => {
    expect(await getCardAmount(idCard)).toEqual([5, 10, 20, 30, 50]);
  });
});

it("should add a credit card and save it in DB", async () => {
  let idCard = v4();
  testUtils.setupMessageStore([
    {
      type: EventTypeCard.GIFT_CARD_ADDED,
      stream_name: "giftCard-" + idCard,
      data: {
        id: idCard,
        name: "Amazon",
        description: "Carta per comprarti il microonde",
        image_url: "https://img.it",
        amounts: [5, 10, 20, 30, 50],
      },
    },
  ]);

  stop = await run();

  await testUtils.waitForExpect(async () => {
    expect(await getCard(idCard)).toEqual({
      id: idCard,
      name: "Amazon",
      description: "Carta per comprarti il microonde",
      image_url: "https://img.it",
      amount: [5, 10, 20, 30, 50],
    });
  });
});

it("should update a credit card and save it in DB", async () => {
  let idCard = v4();
  testUtils.setupMessageStore([
    {
      type: EventTypeCard.GIFT_CARD_ADDED,
      stream_name: "giftCard-" + idCard,
      data: {
        id: idCard,
        name: "Amazon",
        description: "Carta per comprarti il frigo",
        image_url: "https://img.it",
        amounts: [5, 10, 20, 30, 50],
      },
    },
    {
      type: EventTypeCard.GIFT_CARD_UPDATED,
      stream_name: "giftCard-" + idCard,
      data: {
        id: idCard,
        amounts: [5, 10, 20, 30, 50, 100],
      },
    },
  ]);

  stop = await run();

  await testUtils.waitForExpect(async () => {
    expect(await getCard(idCard)).toEqual({
      id: idCard,
      name: "Amazon",
      description: "Carta per comprarti il frigo",
      image_url: "https://img.it",
      amount: [5, 10, 20, 30, 50, 100],
    });
  });
});

it("should remove a credit card saved in DB", async () => {
  let idCard = v4();
  testUtils.setupMessageStore([
    {
      type: EventTypeCard.GIFT_CARD_ADDED,
      stream_name: "giftCard-" + idCard,
      data: {
        id: idCard,
        name: "Amazon",
        description: "Carta per comprarti il frullatore",
        image_url: "https://img.it",
        amounts: [5, 10, 20, 30, 50],
      },
    },
    {
      type: EventTypeCard.GIFT_CARD_REMOVED,
      stream_name: "giftCard-" + idCard,
      data: {
        id: idCard,
      },
    },
  ]);

  stop = await run();

  await testUtils.waitForExpect(async () => {
    expect(await getCard(idCard)).toEqual(null);
  });
});
