import { testUtils } from "@keix/message-store-client";
import { v4 } from "uuid";
import { getBalance, run, getTransactions } from "../src/credits/aggregator";
import { CommandTypeCredit, EventTypeCredit } from "../src/credits/types";

/* let stop: () => void | null = () => null;
afterEach(() => {
  stop();
});
 */
it("should return a positive balance", async () => {
  let idAccount1 = v4();
  let idTrans1 = v4();
  let idTrans2 = v4();
  testUtils.setupMessageStore([
    {
      type: EventTypeCredit.CREDITS_EARNED,
      stream_name: "creditAccount-" + idAccount1,
      data: {
        id: idAccount1,
        amount: 30,
        transactionId: idTrans1,
      },
    },
    {
      type: EventTypeCredit.CREDITS_EARNED,
      stream_name: "creditAccount-" + idAccount1,
      data: {
        id: idAccount1,
        amount: 30,
        transactionId: idTrans2,
      },
    },
  ]);

  //stop = await run();

  await testUtils.expectIdempotency(run, async () => {
    expect(await getBalance(idAccount1)).toEqual("60");
    expect(await getTransactions(idAccount1)).toEqual([
      { id: idTrans1, amount: 30 },
      { id: idTrans2, amount: 30 },
    ]);
  });
});

it("should return a 0 balance", async () => {
  let idAccount1 = v4();
  let idTrans1 = v4();
  let idTrans2 = v4();
  testUtils.setupMessageStore([
    {
      type: EventTypeCredit.CREDITS_EARNED,
      stream_name: "creditAccount-" + idAccount1,
      data: {
        id: idAccount1,
        amount: 300,
        transactionId: idTrans1,
      },
    },
    {
      type: EventTypeCredit.CREDITS_USED,
      stream_name: "creditAccount-" + idAccount1,
      data: {
        id: idAccount1,
        amount: 300,
        transactionId: idTrans2,
      },
    },
  ]);

  await testUtils.expectIdempotency(run, async () => {
    expect(await getBalance(idAccount1)).toEqual("0");
    expect(await getTransactions(idAccount1)).toEqual([
      { id: idTrans1, amount: 300 },
      { id: idTrans2, amount: -300 },
    ]);
  });
});

it("should return balance", async () => {
  let idAccount1 = v4();
  let idTrans1 = v4();
  let idTrans2 = v4();
  let idTrans3 = v4();
  testUtils.setupMessageStore([
    {
      type: EventTypeCredit.CREDITS_EARNED,
      stream_name: "creditAccount-" + idAccount1,
      data: {
        id: idAccount1,
        amount: 300,
        transactionId: idTrans1,
      },
    },
    {
      type: EventTypeCredit.CREDITS_EARNED,
      stream_name: "creditAccount-" + idAccount1,
      data: {
        id: idAccount1,
        amount: 100,
        transactionId: idTrans2,
      },
    },
    {
      type: EventTypeCredit.CREDITS_USED,
      stream_name: "creditAccount-" + idAccount1,
      data: {
        id: idAccount1,
        amount: 200,
        transactionId: idTrans3,
      },
    },
  ]);

  await testUtils.expectIdempotency(run, async () => {
    expect(await getBalance(idAccount1)).toEqual("200");
    expect(await getTransactions(idAccount1)).toEqual([
      { id: idTrans1, amount: 300 },
      { id: idTrans2, amount: 100 },
      { id: idTrans3, amount: -200 },
    ]);
  });
});
