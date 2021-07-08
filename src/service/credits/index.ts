import {
  emitEvent,
  sendCommand,
  subscribe,
  Message,
  readLastMessage,
  combineSubscriber,
} from "@keix/message-store-client";
import { v4 } from "uuid";
import { runBalanceProjector } from "./projector";

import { CommandCredits, CommandTypeCredit, EventTypeCredit } from "./types";
import { CommandSchedulerCommandType, SchedulerRate } from "../scheduler/types";

async function handler(cmd: CommandCredits) {
  const MIN_USE_CREDITS_AMOUNT = 100;

  if (
    await isLastMessageAfterGlobalPosition(`creditAccount-${cmd.data.id}`, cmd)
  ) {
    return;
  }
  if (await isLastMessageAfterGlobalPosition(`commandScheduler:command`, cmd)) {
    return;
  }

  switch (cmd.type) {
    case CommandTypeCredit.EARN_CREDITS:
      if (cmd.data.amount > 0) {
        return emitEvent({
          category: "creditAccount",
          id: cmd.data.id,
          event: EventTypeCredit.CREDITS_EARNED,
          data: {
            id: cmd.data.id,
            transactionId: cmd.data.transactionId ?? v4(),
            amount: cmd.data.amount,
            delayed: cmd.data.delayed ?? false,
            creditDate: cmd.data.creditDate ?? new Date(),
          },
        });
      } else {
        return;
      }
    case CommandTypeCredit.USE_CREDITS:
      let balance = await runBalanceProjector(cmd.data.id);
      if (balance >= MIN_USE_CREDITS_AMOUNT && balance - cmd.data.amount >= 0) {
        return emitEvent({
          category: "creditAccount",
          id: cmd.data.id,
          event: EventTypeCredit.CREDITS_USED,
          data: {
            id: cmd.data.id,
            transactionId: cmd.data.transactionId ?? v4(),
            amount: cmd.data.amount,
            creditDate: cmd.data.creditDate ?? new Date(),
          },
        });
      } else {
        return emitEvent({
          category: "creditAccount",
          id: cmd.data.id,
          event: EventTypeCredit.CREDITS_ERROR,
          data: {
            id: cmd.data.id,
            type:
              balance - cmd.data.amount <= 0
                ? "NotEnoughFunds"
                : "MinimumAmountNotReached",
          },
        });
      }
    case CommandTypeCredit.EARN_DELAYED_CREDIT: {
      let transactionId = cmd.data.transactionId ?? v4();
      await sendCommand({
        command: CommandSchedulerCommandType.SCHEDULE_COMMAND,
        category: "commandScheduler",
        data: {
          id: cmd.data.id,
          category: "creditAccount",
          command: CommandTypeCredit.EARN_CREDITS,
          commandData: {
            id: cmd.data.id,
            transactionId: transactionId,
            amount: cmd.data.amount,
            delayed: true,
            creditDate: cmd.data.creditDate,
          },
          date: cmd.data.creditDate,
          rate: SchedulerRate.NONE,
        },
      });
      return emitEvent({
        category: "creditAccount",
        id: cmd.data.id,
        event: EventTypeCredit.CREDITS_SCHEDULED,
        data: {
          id: cmd.data.id,
          transactionId: transactionId,
          amount: cmd.data.amount,
          creditDate: cmd.data.creditDate,
          delayed: false,
        },
      });
    }
  }
}

export async function runCredits() {
  return combineSubscriber(
    subscribe(
      {
        streamName: "creditAccount:command",
      },
      handler
    )
  );
}

async function isLastMessageAfterGlobalPosition(
  streamName: string,
  message: Message
) {
  const { global_position } = message;
  const lastMsg = await readLastMessage({
    streamName,
  });
  return lastMsg && lastMsg.global_position > global_position;
}
