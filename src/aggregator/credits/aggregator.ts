import {
  subscribe,
  Message,
  readLastMessage,
  combineSubscriber,
} from "@keix/message-store-client";
import { EventCredits, EventTypeCredit } from "../../service/credits/types";
import Redis from "ioredis";
import { Client, RequestParams } from "@elastic/elasticsearch";
import {
  runBalancePendingProjector,
  runBalanceProjector,
} from "../../service/credits/projector";

let redisClient = new Redis();

const elasticClient = new Client({ node: "https://dev.elastic.keix.com" });

const ELASTICDBNAME = "usertxdaniele";

interface UserTransaction {
  id: string;
  amount: number;
  userId: string;
  time: Date;
  creditDate: Date;
  delayed: boolean;
}

export async function getBalance(userId: string) {
  return await redisClient.hget("userBalance", userId);
}

export async function getPendingBalance(userId: string) {
  return await redisClient.hget("userPendingBalance", userId);
}

export async function getTransactions(userId: string, typeOrder: string) {
  const params: RequestParams.Search = {
    index: ELASTICDBNAME,
    body: {
      sort: [{ time: { order: typeOrder } }],
      query: {
        match: {
          userId: userId,
        },
      },
    },
  };
  return await (await elasticClient.search(params)).body.hits.hits;
}

export async function hasProcessedTransaction(transactionId: string) {
  try {
    let res = await elasticClient.get({
      index: ELASTICDBNAME,
      id: transactionId,
    });
    return true;
  } catch (err) {
    return false;
  }
}
async function handler(event: EventCredits) {
  if (
    (event.type == EventTypeCredit.CREDITS_EARNED ||
      event.type == EventTypeCredit.CREDITS_USED ||
      event.type == EventTypeCredit.CREDITS_SCHEDULED) &&
    (await hasProcessedTransaction(event.data.transactionId))
  ) {
    return;
  }
  switch (event.type) {
    case EventTypeCredit.CREDITS_EARNED: {
      //if (event.position % 10 === 0 && event.position !== 0) {
      // const balance = await runBalanceProjector(event.data.id);
      //await redisClient.hset("userBalance", event.data.id, balance);
      //} else {
      await redisClient.hset(
        "userBalance",
        event.data.id,
        await runBalanceProjector(event.data.id)
      );
      // }

      await redisClient.hset(
        "userPendingBalance",
        event.data.id,
        await runBalancePendingProjector(event.data.id)
      );

      let transaction: UserTransaction = {
        id: event.data.transactionId,
        amount: event.data.amount,
        userId: event.data.id,
        time: event.time,
        delayed: false,
        creditDate: event.data.creditDate ?? new Date(),
      };

      return elasticClient.index({
        index: ELASTICDBNAME,
        id: event.data.transactionId,
        refresh: true,
        body: transaction,
      });
    }

    case EventTypeCredit.CREDITS_SCHEDULED: {
      await redisClient.hset(
        "userPendingBalance",
        event.data.id,
        await runBalancePendingProjector(event.data.id)
      );

      let transaction: UserTransaction = {
        id: event.data.transactionId,
        amount: -event.data.amount,
        userId: event.data.id,
        creditDate: event.data.creditDate,
        time: event.time,
        delayed: true,
      };

      return elasticClient.index({
        index: ELASTICDBNAME,
        id: event.data.transactionId,
        refresh: true,
        body: transaction,
      });
    }

    case EventTypeCredit.CREDITS_USED: {
      await redisClient.hset(
        "userBalance",
        event.data.id,
        await runBalanceProjector(event.data.id)
      );

      let transaction: UserTransaction = {
        id: event.data.transactionId,
        amount: -event.data.amount,
        userId: event.data.id,
        time: event.time,
        delayed: false,
        creditDate: new Date(),
      };

      return elasticClient.index({
        index: ELASTICDBNAME,
        id: event.data.transactionId,
        refresh: true,
        body: transaction,
      });
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
