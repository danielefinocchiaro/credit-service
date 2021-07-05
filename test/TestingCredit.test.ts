import { testUtils } from "@keix/message-store-client";
import { v4 } from "uuid";
import { runCredits } from "../src/service/credits";
import {
  runBalancePendingProjector,
  runBalanceProjector,
} from "../src/service/credits/projector";
import {
  CommandTypeCredit,
  EventTypeCredit,
} from "../src/service/credits/types";
import { CommandSchedulerCommandType } from "../src/service/scheduler/types";

it("should return 0 at start", async () => {
  let idAccount1 = v4();
  testUtils.setupMessageStore([]);

  expect(await runBalanceProjector(idAccount1)).toEqual(0);
});

it("should earn a number of credits to a specific account", async () => {
  let idAccount1 = v4();
  testUtils.setupMessageStore([
    {
      type: CommandTypeCredit.EARN_CREDITS,
      stream_name: "creditAccount:command-" + idAccount1,
      data: {
        id: idAccount1,
        amount: 30,
      },
    },
  ]);

  await testUtils.expectIdempotency(runCredits, () => {
    let event = testUtils.getStreamMessages("creditAccount");
    expect(event).toHaveLength(1);
    expect(event[0].type).toEqual(EventTypeCredit.CREDITS_EARNED);
    expect(event[0].data.id).toEqual(idAccount1);
    expect(event[0].data.amount).toEqual(30);
  });
});

it("should earn a number of credits to a specific account only if the validation date is passed", async () => {
  let idAccount1 = v4();
  testUtils.setupMessageStore([
    {
      type: CommandTypeCredit.EARN_DELAYED_CREDIT,
      stream_name: "creditAccount:command-" + idAccount1,
      data: {
        id: idAccount1,
        amount: 30,
        validationDate: new Date(2022, 1, 1),
      },
    },
  ]);

  await testUtils.expectIdempotency(runCredits, () => {
    let command = testUtils.getStreamMessages("commandScheduler:command");
    let event = testUtils.getStreamMessages("creditAccount");
    expect(event).toHaveLength(1);
    expect(event[0].type).toEqual(EventTypeCredit.CREDITS_SCHEDULED);
    expect(command).toHaveLength(1);
    expect(command[0].type).toEqual(
      CommandSchedulerCommandType.SCHEDULE_COMMAND
    );
    expect(command[0].data.id).toEqual(idAccount1);
  });
  expect(await runBalanceProjector(idAccount1)).toEqual(0);
});

it("should earn a number of credits to a specific account with a transaction id", async () => {
  let idAccount1 = v4();
  let idTrans = v4();
  testUtils.setupMessageStore([
    {
      type: CommandTypeCredit.EARN_CREDITS,
      stream_name: "creditAccount:command-" + idAccount1,
      data: {
        id: idAccount1,
        amount: 30,
        transactionId: idTrans,
      },
    },
  ]);

  await testUtils.expectIdempotency(runCredits, () => {
    let event = testUtils.getStreamMessages("creditAccount");
    expect(event).toHaveLength(1);
    expect(event[0].type).toEqual(EventTypeCredit.CREDITS_EARNED);
    expect(event[0].data.id).toEqual(idAccount1);
    expect(event[0].data.amount).toEqual(30);
  });
});

it("shouldn't earn a number of credits to a specific account if the number is negative", async () => {
  let idAccount1 = v4();
  testUtils.setupMessageStore([
    {
      type: CommandTypeCredit.EARN_CREDITS,
      stream_name: "creditAccount:command-" + idAccount1,
      data: {
        id: idAccount1,
        amount: -30,
      },
    },
  ]);

  await testUtils.expectIdempotency(runCredits, () => {
    let event = testUtils.getStreamMessages("creditAccount");
    expect(event).toHaveLength(0);
  });
});

it("shouldn't use a number of credits of a specific account if isn't up to minimum account", async () => {
  let idAccount1 = v4();
  testUtils.setupMessageStore([
    {
      type: CommandTypeCredit.USE_CREDITS,
      stream_name: "creditAccount:command-" + idAccount1,
      data: {
        id: idAccount1,
        amount: 30,
      },
    },
  ]);

  expect(await runBalanceProjector(idAccount1)).toEqual(0);

  await testUtils.expectIdempotency(runCredits, () => {
    let event = testUtils.getStreamMessages("creditAccount");
    expect(event).toHaveLength(1);
    expect(event[0].type).toEqual(EventTypeCredit.CREDITS_ERROR);
    expect(event[0].data.id).toEqual(idAccount1);
    expect(event[0].data.type).toEqual("NotEnoughFunds");
  });
});

it("should use a number of credits to a specific account if the account have the correct balance", async () => {
  let idAccount1 = v4();
  testUtils.setupMessageStore([
    {
      type: EventTypeCredit.CREDITS_EARNED,
      stream_name: "creditAccount-" + idAccount1,
      data: {
        id: idAccount1,
        amount: 100,
        validationDate: new Date(),
      },
    },
    {
      type: CommandTypeCredit.USE_CREDITS,
      stream_name: "creditAccount:command-" + idAccount1,
      data: {
        id: idAccount1,
        amount: 130,
      },
    },
  ]);

  await testUtils.expectIdempotency(runCredits, () => {
    let event = testUtils.getStreamMessages("creditAccount");
    expect(event).toHaveLength(2);
    expect(event[1].type).toEqual(EventTypeCredit.CREDITS_ERROR);
    expect(event[1].data.id).toEqual(idAccount1);
    expect(event[1].data.type).toEqual("NotEnoughFunds");
  });

  expect(await runBalanceProjector(idAccount1)).toEqual(100);
});

it("should use all the credits available", async () => {
  let idAccount1 = v4();
  testUtils.setupMessageStore([
    {
      type: EventTypeCredit.CREDITS_EARNED,
      stream_name: "creditAccount-" + idAccount1,
      data: {
        id: idAccount1,
        amount: 150,
        validationDate: new Date(),
      },
    },
    {
      type: CommandTypeCredit.USE_CREDITS,
      stream_name: "creditAccount:command-" + idAccount1,
      data: {
        id: idAccount1,
        amount: 150,
      },
    },
  ]);

  await testUtils.expectIdempotency(runCredits, () => {
    let event = testUtils.getStreamMessages("creditAccount");
    expect(event).toHaveLength(2);
    expect(event[1].type).toEqual(EventTypeCredit.CREDITS_USED);
  });

  expect(await runBalanceProjector(idAccount1)).toEqual(0);
});

it("should use a number of credits to a specific account with a transaction id", async () => {
  let idAccount1 = v4();
  let idTrans = v4();
  testUtils.setupMessageStore([
    {
      type: EventTypeCredit.CREDITS_EARNED,
      stream_name: "creditAccount-" + idAccount1,
      data: {
        id: idAccount1,
        amount: 130,
        transactionId: idTrans,
        validationDate: new Date(),
      },
    },
    {
      type: CommandTypeCredit.USE_CREDITS,
      stream_name: "creditAccount:command-" + idAccount1,
      data: {
        id: idAccount1,
        amount: 100,
        transactionId: idTrans,
      },
    },
  ]);

  await testUtils.expectIdempotency(runCredits, () => {
    let event = testUtils.getStreamMessages("creditAccount");
    expect(event).toHaveLength(2);
    expect(event[1].type).toEqual(EventTypeCredit.CREDITS_USED);
    expect(event[1].data.id).toEqual(idAccount1);
  });

  expect(await runBalanceProjector(idAccount1)).toEqual(30);
});

it("should calculate the balance of a specific account", async () => {
  let idAccount1 = v4();
  let idAccount2 = v4();
  testUtils.setupMessageStore([
    {
      type: EventTypeCredit.CREDITS_EARNED,
      stream_name: "creditAccount-" + idAccount1,
      data: {
        id: idAccount1,
        amount: 30,
        validationDate: new Date(),
      },
    },
    {
      type: EventTypeCredit.CREDITS_EARNED,
      stream_name: "creditAccount-" + idAccount2,
      data: {
        id: idAccount2,
        amount: 30,
        validationDate: new Date(),
      },
    },
    {
      type: EventTypeCredit.CREDITS_EARNED,
      stream_name: "creditAccount-" + idAccount1,
      data: {
        id: idAccount1,
        amount: 20,
        validationDate: new Date(),
      },
    },
    {
      type: EventTypeCredit.CREDITS_EARNED,
      stream_name: "creditAccount-" + idAccount1,
      data: {
        id: idAccount1,
        amount: 50,
        validationDate: new Date(),
      },
    },
  ]);

  expect(await runBalanceProjector(idAccount1)).toEqual(100);
});

it("should calculate the balance (mix of use and earn) of a specific account", async () => {
  let idAccount1 = v4();
  let idAccount2 = v4();
  testUtils.setupMessageStore([
    {
      type: EventTypeCredit.CREDITS_EARNED,
      stream_name: "creditAccount-" + idAccount1,
      data: {
        id: idAccount1,
        amount: 70,
        validationDate: new Date(),
      },
    },
    {
      type: EventTypeCredit.CREDITS_EARNED,
      stream_name: "creditAccount-" + idAccount2,
      data: {
        id: idAccount2,
        amount: 30,
        validationDate: new Date(),
      },
    },
    {
      type: EventTypeCredit.CREDITS_EARNED,
      stream_name: "creditAccount-" + idAccount1,
      data: {
        id: idAccount1,
        amount: 50,
        validationDate: new Date(),
      },
    },
    {
      type: EventTypeCredit.CREDITS_USED,
      stream_name: "creditAccount-" + idAccount1,
      data: {
        id: idAccount1,
        amount: 100,
      },
    },
  ]);

  expect(await runBalanceProjector(idAccount1)).toEqual(20);
});

it("should calculate the balance of a specific account only if the deadline is valid", async () => {
  let idAccount1 = v4();
  let timePast = new Date();
  timePast.setMonth(timePast.getMonth() - 14);
  testUtils.setupMessageStore([
    {
      type: EventTypeCredit.CREDITS_EARNED,
      stream_name: "creditAccount-" + idAccount1,
      data: {
        id: idAccount1,
        amount: 70,
        validationDate: timePast,
      },
      time: timePast,
    },
    {
      type: EventTypeCredit.CREDITS_EARNED,
      stream_name: "creditAccount-" + idAccount1,
      data: {
        id: idAccount1,
        amount: 300,
        validationDate: new Date(),
      },
    },
    {
      type: EventTypeCredit.CREDITS_EARNED,
      stream_name: "creditAccount-" + idAccount1,
      data: {
        id: idAccount1,
        amount: 50,
        validationDate: timePast,
      },
      time: timePast,
    },

    {
      type: EventTypeCredit.CREDITS_USED,
      stream_name: "creditAccount-" + idAccount1,
      data: {
        id: idAccount1,
        amount: 100,
      },
    },
  ]);

  expect(await runBalanceProjector(idAccount1)).toEqual(200);
});
