import { testUtils } from "@keix/message-store-client";
import { v4 } from "uuid";
import { runGiftCard } from "../src/service/giftCard";
import {
  CommandTypeCredit,
  EventTypeCredit,
} from "../src/service/credits/types";
import { CommandTypeCard, EventTypeCard } from "../src/service/giftCard/types";

it("should add a card", async () => {
  let idCard = v4();
  testUtils.setupMessageStore([
    {
      type: CommandTypeCard.ADD_GIFT_CARD,
      stream_name: "giftCard:command-" + idCard,
      data: {
        id: idCard,
        name: "Amazon",
        description: "Carta per comprarti il frigo",
        image_url: "https://img.it",
        amounts: [5, 10, 20, 30, 50],
      },
    },
  ]);

  await testUtils.expectIdempotency(runGiftCard, () => {
    let event = testUtils.getStreamMessages("giftCard");
    expect(event).toHaveLength(1);
    expect(event[0].type).toEqual(EventTypeCard.GIFT_CARD_ADDED);
    expect(event[0].data.id).toEqual(idCard);
    expect(event[0].data.name).toEqual("Amazon");
    expect(event[0].data.amounts).toEqual([5, 10, 20, 30, 50]);
  });
});

it("shouldn't remove a card if not exist", async () => {
  let idCard = v4();
  testUtils.setupMessageStore([
    {
      type: CommandTypeCard.REMOVE_GIFT_CARD,
      stream_name: "giftCard:command-" + idCard,
      data: {
        id: idCard,
      },
    },
  ]);

  await testUtils.expectIdempotency(runGiftCard, () => {
    let event = testUtils.getStreamMessages("giftCard");
    expect(event).toHaveLength(1);
    expect(event[0].type).toEqual(EventTypeCard.GIFT_CARD_ERROR);
    expect(event[0].data.type).toEqual("CardNotExist");
  });
});

it("should remove a card", async () => {
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
      type: CommandTypeCard.REMOVE_GIFT_CARD,
      stream_name: "giftCard:command-" + idCard,
      data: {
        id: idCard,
      },
    },
  ]);

  await testUtils.expectIdempotency(runGiftCard, () => {
    let event = testUtils.getStreamMessages("giftCard");
    expect(event).toHaveLength(2);
    expect(event[1].type).toEqual(EventTypeCard.GIFT_CARD_REMOVED);
    expect(event[1].data.id).toEqual(idCard);
  });
});

it("should update a card", async () => {
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
      type: CommandTypeCard.UPDATE_GIFT_CARD,
      stream_name: "giftCard:command-" + idCard,
      data: {
        id: idCard,
        name: "Amazon",
        description: "Carta per comprarti il frullatore",
      },
    },
  ]);

  await testUtils.expectIdempotency(runGiftCard, () => {
    let event = testUtils.getStreamMessages("giftCard");
    expect(event).toHaveLength(2);
    expect(event[1].type).toEqual(EventTypeCard.GIFT_CARD_UPDATED);
    expect(event[1].data.id).toEqual(idCard);
  });
});

it("shouldn't update a card if not exist", async () => {
  let idCard = v4();
  testUtils.setupMessageStore([
    {
      type: CommandTypeCard.UPDATE_GIFT_CARD,
      stream_name: "giftCard:command-" + idCard,
      data: {
        id: idCard,
        name: "Amazon",
        description: "Carta per comprarti il frullatore",
      },
    },
  ]);

  await testUtils.expectIdempotency(runGiftCard, () => {
    let event = testUtils.getStreamMessages("giftCard");
    expect(event).toHaveLength(1);
    expect(event[0].type).toEqual(EventTypeCard.GIFT_CARD_ERROR);
    expect(event[0].data.type).toEqual("CardNotExist");
  });
});

it("shouldn't use a card if the amount not exist", async () => {
  let idCard = v4();
  let idAccount1 = v4();
  let idTrans = v4();
  testUtils.setupMessageStore([
    {
      type: EventTypeCredit.CREDITS_EARNED,
      stream_name: "creditAccount-" + idAccount1,
      data: {
        id: idAccount1,
        amountCredit: 1000,
      },
    },
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
      type: CommandTypeCard.REDEEM_GIFT_CARD,
      stream_name: "giftCardTransaction:command-" + idCard,
      data: {
        id: idCard,
        userId: idAccount1,
        amount: 55,
        transactionId: idTrans,
      },
    },
  ]);

  await testUtils.expectIdempotency(runGiftCard, () => {
    let eventG = testUtils.getStreamMessages("giftCard");
    let eventT = testUtils.getStreamMessages("giftCardTransaction");
    expect(eventG).toHaveLength(1);
    expect(eventT).toHaveLength(2);
    expect(eventG[0].type).toEqual(EventTypeCard.GIFT_CARD_ADDED);
    expect(eventT[0].type).toEqual(EventTypeCard.GIFT_CARD_REDEEM_PENDING);
    expect(eventT[1].type).toEqual(EventTypeCard.GIFT_CARD_REDEEM_FAILED);
  });
});

it("should use a card if all stuffs are ok", async () => {
  let idCard = v4();
  let idTrans = v4();
  let idAccount1 = v4();
  testUtils.setupMessageStore([
    {
      type: EventTypeCredit.CREDITS_EARNED,
      stream_name: "creditAccount-" + idAccount1,
      data: {
        id: idAccount1,
        amountCredit: 1000,
      },
    },
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
      type: EventTypeCard.GIFT_CARD_REDEEM_PENDING,
      stream_name: "giftCardTransaction-" + idTrans,
      data: {
        transactionId: idTrans,
        idCard: idCard,
        userId: idAccount1,
        amount: 50,
      },
    },
    {
      type: EventTypeCredit.CREDITS_USED,
      stream_name: "creditAccount-" + idAccount1,
      data: {
        id: idAccount1,
        amountCredit: 50,
        transactionId: idTrans,
      },
    },
    {
      type: EventTypeCard.GIFT_CARD_REDEEM_PROCESSING,
      stream_name: "giftCardTransaction-" + idTrans,
      data: {
        transactionId: idTrans,
        idCard: idCard,
        userId: idAccount1,
      },
    },
    {
      type: CommandTypeCard.DELIVERY_GIFT_CARD,
      stream_name: "giftCardTransaction:command-" + idTrans,
      data: {
        transactionId: idTrans,
        idCard: idCard,
        userId: idAccount1,
      },
    },
  ]);

  await testUtils.expectIdempotency(runGiftCard, () => {
    let eventG = testUtils.getStreamMessages("giftCard");
    let eventT = testUtils.getStreamMessages("giftCardTransaction");
    expect(eventG).toHaveLength(1);
    expect(eventT).toHaveLength(3);
    expect(eventG[0].type).toEqual(EventTypeCard.GIFT_CARD_ADDED);
    expect(eventT[0].type).toEqual(EventTypeCard.GIFT_CARD_REDEEM_PENDING);
    expect(eventT[1].type).toEqual(EventTypeCard.GIFT_CARD_REDEEM_PROCESSING);
    expect(eventT[2].type).toEqual(EventTypeCard.GIFT_CARD_REDEEM_SUCCEDED);
  });
});

it("should emit useCredit if the card exists and there is a valid amount", async () => {
  let idTrans = v4();
  let idAccount1 = v4();
  let idCard = v4();
  testUtils.setupMessageStore([
    {
      type: EventTypeCard.GIFT_CARD_ADDED,
      stream_name: "giftCard-" + idCard,
      data: {
        idCard: idCard,
        name: "Amazon",
        description: "Carta per comprarti il frigo",
        image_url: "https://img.it",
        amounts: [5, 10, 20, 30, 50],
      },
    },
    {
      type: CommandTypeCard.REDEEM_GIFT_CARD,
      stream_name: "giftCardTransaction:command-" + idCard,
      data: {
        idCard: idCard,
        userId: idAccount1,
        amount: 20,
        transactionId: idTrans,
      },
    },
  ]);

  await testUtils.expectIdempotency(runGiftCard, () => {
    let eventT = testUtils.getStreamMessages("giftCardTransaction");
    let commandT = testUtils.getStreamMessages("creditAccount:command");
    expect(eventT).toHaveLength(1);
    expect(eventT[0].type).toEqual(EventTypeCard.GIFT_CARD_REDEEM_PENDING);
    expect(commandT[0].type).toEqual(CommandTypeCredit.USE_CREDITS);
  });
});

it("shouldn't delivery a card if is not in state of processing", async () => {
  let idCard = v4();
  let idTrans = v4();
  let idAccount1 = v4();
  testUtils.setupMessageStore([
    {
      type: CommandTypeCard.DELIVERY_GIFT_CARD,
      stream_name: "giftCardTransaction:command-" + idTrans,
      data: {
        transactionId: idTrans,
        idCard: idCard,
        userId: idAccount1,
      },
    },
  ]);

  await testUtils.expectIdempotency(runGiftCard, () => {
    let eventT = testUtils.getStreamMessages("giftCardTransaction");
    expect(eventT).toHaveLength(1);
    expect(eventT[0].type).toEqual(EventTypeCard.GIFT_CARD_REDEEM_FAILED);
  });
});

it("set redeem if the credits are used", async () => {
  let idCard = v4();
  let idTrans = v4();
  let idAccount1 = v4();
  testUtils.setupMessageStore([
    {
      type: EventTypeCard.GIFT_CARD_REDEEM_PENDING,
      stream_name: "giftCardTransaction-" + idTrans,
      data: {
        transactionId: idTrans,
        idCard: idCard,
        userId: idAccount1,
        amount: 50,
      },
    },
    {
      type: EventTypeCredit.CREDITS_USED,
      stream_name: "creditAccount-" + idAccount1,
      data: {
        id: idAccount1,
        amountCredit: 50,
        transactionId: idTrans,
      },
    },
  ]);

  await testUtils.expectIdempotency(runGiftCard, () => {
    let eventT = testUtils.getStreamMessages("giftCardTransaction");
    expect(eventT).toHaveLength(2);
    expect(eventT[1].type).toEqual(EventTypeCard.GIFT_CARD_REDEEM_PROCESSING);
  });
});
