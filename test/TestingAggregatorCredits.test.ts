import { Client, events } from "@elastic/elasticsearch";
import { testUtils } from "@keix/message-store-client";
import { v4 } from "uuid";
import {
  getBalance,
  run,
  getTransactions,
} from "../src/aggregator/credits/aggregator";
import {
  CommandTypeCredit,
  EventTypeCredit,
} from "../src/service/credits/types";

const elasticClient = new Client({ node: "https://dev.elastic.keix.com" });

const ELASTICDBNAME = "usertxdaniele";

it("should return a positive balance (DESC)", async () => {
  let idAccount1 = v4();
  let idTrans1 = v4();
  let idTrans2 = v4();
  let dateNow = new Date(2021, 1, 1);
  let datePast = new Date(2020, 1, 1);

  testUtils.setupMessageStore([
    {
      type: EventTypeCredit.CREDITS_EARNED,
      stream_name: "creditAccount-" + idAccount1,
      time: dateNow,
      data: {
        id: idAccount1,
        amount: 30,
        transactionId: idTrans1,
        time: dateNow,
        creditDate: dateNow,
      },
    },
    {
      type: EventTypeCredit.CREDITS_EARNED,
      stream_name: "creditAccount-" + idAccount1,
      time: datePast,
      data: {
        id: idAccount1,
        amount: 30,
        transactionId: idTrans2,
        time: datePast,
        creditDate: datePast,
      },
    },
  ]);

  //stop = await run();

  await testUtils.expectIdempotency(run, async () => {
    expect(await getBalance(idAccount1)).toEqual("60");
    let res = await getTransactions(idAccount1, "desc");
    expect(res[0]._source).toEqual({
      id: idTrans1,
      amount: 30,
      userId: idAccount1,
      time: dateNow.toISOString(),
      delayed: false,
      creditDate: dateNow.toISOString(),
    });
    expect(res[1]._source).toEqual({
      id: idTrans2,
      amount: 30,
      userId: idAccount1,
      time: datePast.toISOString(),
      delayed: false,
      creditDate: datePast.toISOString(),
    });
  });
  /* 
  elasticClient.delete({
    index: ELASTICDBNAME,
    id: idAccount1,
  }); */
});

it("should return a positive balance (ASC)", async () => {
  let idAccount1 = v4();
  let idTrans1 = v4();
  let idTrans2 = v4();
  let dateNow = new Date(2021, 1, 1);
  let datePast = new Date(2020, 1, 1);
  testUtils.setupMessageStore([
    {
      type: EventTypeCredit.CREDITS_EARNED,
      stream_name: "creditAccount-" + idAccount1,
      time: dateNow,
      data: {
        id: idAccount1,
        amount: 30,
        transactionId: idTrans1,
        time: dateNow,
        creditDate: dateNow,
      },
    },
    {
      type: EventTypeCredit.CREDITS_EARNED,
      stream_name: "creditAccount-" + idAccount1,
      time: datePast,
      data: {
        id: idAccount1,
        amount: 30,
        transactionId: idTrans2,
        time: datePast,
        creditDate: datePast,
      },
    },
  ]);

  //stop = await run();

  await testUtils.expectIdempotency(run, async () => {
    expect(await getBalance(idAccount1)).toEqual("60");
    let res = await getTransactions(idAccount1, "asc");
    expect(res[1]._source).toEqual({
      id: idTrans1,
      amount: 30,
      userId: idAccount1,
      time: dateNow.toISOString(),
      delayed: false,
      creditDate: dateNow.toISOString(),
    });
    expect(res[0]._source).toEqual({
      id: idTrans2,
      amount: 30,
      userId: idAccount1,
      time: datePast.toISOString(),
      delayed: false,
      creditDate: datePast.toISOString(),
    });
  });
  /* 
  elasticClient.delete({
    index: ELASTICDBNAME,
    id: idAccount1,
  }); */
});

it("should return a 0 balance (DESC)", async () => {
  let idAccount1 = v4();
  let idTrans1 = v4();
  let idTrans2 = v4();
  let dateNow = new Date(2021, 1, 1);
  let datePast = new Date(2020, 1, 1);
  testUtils.setupMessageStore([
    {
      type: EventTypeCredit.CREDITS_EARNED,
      stream_name: "creditAccount-" + idAccount1,
      time: dateNow,
      data: {
        id: idAccount1,
        amount: 300,
        transactionId: idTrans1,
        time: dateNow,
        creditDate: dateNow,
      },
    },
    {
      type: EventTypeCredit.CREDITS_USED,
      stream_name: "creditAccount-" + idAccount1,
      time: datePast,
      data: {
        id: idAccount1,
        amount: 300,
        transactionId: idTrans2,
        time: datePast,
        creditDate: datePast,
      },
    },
  ]);

  await testUtils.expectIdempotency(run, async () => {
    expect(await getBalance(idAccount1)).toEqual("0");
    let res = await getTransactions(idAccount1, "desc");
    expect(res[0]._source).toEqual({
      id: idTrans1,
      amount: 300,
      userId: idAccount1,
      time: dateNow.toISOString(),
      delayed: false,
      creditDate: dateNow.toISOString(),
    });
    expect(res[1]._source).toEqual({
      id: idTrans2,
      amount: -300,
      userId: idAccount1,
      time: datePast.toISOString(),
      delayed: false,
      creditDate: datePast.toISOString(),
    });
  });
  /* 
  elasticClient.delete({
    index: ELASTICDBNAME,
    id: idAccount1,
  }); */
});

it("should return balance (DESC)", async () => {
  let idAccount1 = v4();
  let idTrans1 = v4();
  let idTrans2 = v4();
  let idTrans3 = v4();
  let dateNow = new Date(2021, 1, 1);
  let datePast = new Date(2020, 1, 1);
  testUtils.setupMessageStore([
    {
      type: EventTypeCredit.CREDITS_EARNED,
      stream_name: "creditAccount-" + idAccount1,
      time: dateNow,
      data: {
        id: idAccount1,
        amount: 300,
        transactionId: idTrans1,
        time: dateNow,
        creditDate: dateNow,
      },
    },
    {
      type: EventTypeCredit.CREDITS_EARNED,
      stream_name: "creditAccount-" + idAccount1,
      time: dateNow,
      data: {
        id: idAccount1,
        amount: 100,
        transactionId: idTrans2,
        time: dateNow,
        creditDate: dateNow,
      },
    },
    {
      type: EventTypeCredit.CREDITS_USED,
      stream_name: "creditAccount-" + idAccount1,
      time: datePast,
      data: {
        id: idAccount1,
        amount: 200,
        transactionId: idTrans3,
        time: datePast,
        creditDate: datePast,
      },
    },
  ]);

  await testUtils.expectIdempotency(run, async () => {
    expect(await getBalance(idAccount1)).toEqual("200");
    let res = await getTransactions(idAccount1, "desc");
    expect(res[0]._source).toEqual({
      id: idTrans1,
      amount: 300,
      userId: idAccount1,
      time: dateNow.toISOString(),
      delayed: false,
      creditDate: dateNow.toISOString(),
    });
    expect(res[1]._source).toEqual({
      id: idTrans2,
      amount: 100,
      userId: idAccount1,
      time: dateNow.toISOString(),
      delayed: false,
      creditDate: dateNow.toISOString(),
    });
    expect(res[2]._source).toEqual({
      id: idTrans3,
      amount: -200,
      userId: idAccount1,
      time: datePast.toISOString(),
      delayed: false,
      creditDate: datePast.toISOString(),
    });
  });

  /*  elasticClient.delete({
    index: ELASTICDBNAME,
    id: idAccount1,
  }); */
});

it("should return balance (ASC)", async () => {
  let idAccount1 = v4();
  let idTrans1 = v4();
  let idTrans2 = v4();
  let idTrans3 = v4();
  let dateNow = new Date(2021, 1, 1);
  let datePast = new Date(2020, 1, 1);
  let datePastPast = new Date(2019, 1, 1);
  testUtils.setupMessageStore([
    {
      type: EventTypeCredit.CREDITS_EARNED,
      stream_name: "creditAccount-" + idAccount1,
      time: dateNow,
      data: {
        id: idAccount1,
        amount: 300,
        transactionId: idTrans1,
        time: dateNow,
        creditDate: dateNow,
      },
    },
    {
      type: EventTypeCredit.CREDITS_EARNED,
      stream_name: "creditAccount-" + idAccount1,
      time: datePast,
      data: {
        id: idAccount1,
        amount: 100,
        transactionId: idTrans2,
        time: datePast,
        creditDate: datePast,
      },
    },
    {
      type: EventTypeCredit.CREDITS_USED,
      stream_name: "creditAccount-" + idAccount1,
      time: datePastPast,
      data: {
        id: idAccount1,
        amount: 200,
        transactionId: idTrans3,
        time: datePastPast,
        creditDate: datePastPast,
      },
    },
  ]);

  await testUtils.expectIdempotency(run, async () => {
    expect(await getBalance(idAccount1)).toEqual("200");
    let res = await getTransactions(idAccount1, "asc");
    expect(res[2]._source).toEqual({
      id: idTrans1,
      amount: 300,
      userId: idAccount1,
      time: dateNow.toISOString(),
      delayed: false,
      creditDate: dateNow.toISOString(),
    });
    expect(res[1]._source).toEqual({
      id: idTrans2,
      amount: 100,
      userId: idAccount1,
      time: datePast.toISOString(),
      delayed: false,
      creditDate: datePast.toISOString(),
    });
    expect(res[0]._source).toEqual({
      id: idTrans3,
      amount: -200,
      userId: idAccount1,
      time: datePastPast.toISOString(),
      delayed: false,
      creditDate: datePastPast.toISOString(),
    });
  });

  /* elasticClient.delete({
    index: ELASTICDBNAME,
    id: idAccount1,
  }); */
});
