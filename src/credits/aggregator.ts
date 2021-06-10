import {
  subscribe,
  Message,
  readLastMessage,
  combineSubscriber,
} from "@keix/message-store-client";
import { runBalanceProjector } from "./projector";
import { EventCredits, EventTypeCredit } from "./types";
import Redis from "ioredis";

let redisClient = new Redis();

interface UserTransaction {
  id: string;
  amount: number;
}

export async function getBalance(userId: string) {
  return await redisClient.hget("userBalance", userId);
}

export async function getTransactions(
  userId: string
): Promise<UserTransaction[]> {
  let keyUser = `creditAccount/${userId}`;
  let transactrionsList = await redisClient.lrange(
    keyUser,
    0,
    await redisClient.llen(keyUser)
  );

  return transactrionsList.map((transaction) => {
    return JSON.parse(transaction);
  });
}

export async function hasProcessedTransaction(
  id: string,
  transactionId: string
): Promise<boolean> {
  let transactions = await getTransactions(id);
  return (
    transactions.find((d: { id: string }) => d.id == transactionId) != null
  );
}

async function handler(event: EventCredits) {
  if (
    (event.type == EventTypeCredit.CREDITS_EARNED ||
      event.type == EventTypeCredit.CREDITS_USED) &&
    (await hasProcessedTransaction(event.data.id, event.data.transactionId))
  ) {
    return;
  }
  switch (event.type) {
    case EventTypeCredit.CREDITS_EARNED: {
      await redisClient.hincrby(
        "userBalance",
        event.data.id,
        event.data.amount
      );

      let key = `creditAccount/${event.data.id}`;

      let transaction: UserTransaction = {
        id: event.data.transactionId,
        amount: event.data.amount,
      };

      return redisClient.rpush(key, JSON.stringify(transaction));
    }

    case EventTypeCredit.CREDITS_USED: {
      await redisClient.hincrby(
        "userBalance",
        event.data.id,
        -event.data.amount
      );

      let key = `creditAccount/${event.data.id}`;

      let transaction: UserTransaction = {
        id: event.data.transactionId,
        amount: -event.data.amount,
      };

      return redisClient.rpush(key, JSON.stringify(transaction));
    }
  }
}

export async function run() {
  return combineSubscriber(
    subscribe(
      {
        streamName: "creditAccount",
      },
      handler
    )
  );
}
