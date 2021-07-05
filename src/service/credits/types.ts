import type { Message } from "@keix/message-store-client";

export enum CommandTypeCredit {
  EARN_CREDITS = "EARN_CREDITS",
  EARN_DELAYED_CREDIT = "EARN_DELAYED_CREDIT",
  USE_CREDITS = "USE_CREDITS",
}

export type EarnCredits = Message<
  CommandTypeCredit.EARN_CREDITS,
  {
    id: string;
    amount: number;
    transactionId?: string;
    delayed?: Boolean;
    validationDate?: Date;
  }
>;

export type EarnDelayedCredit = Message<
  CommandTypeCredit.EARN_DELAYED_CREDIT,
  {
    id: string;
    amount: number;
    transactionId?: string;
    validationDate: Date;
  }
>;

export type UseCredits = Message<
  CommandTypeCredit.USE_CREDITS,
  { id: string; amount: number; transactionId?: string; validationDate?: Date }
>;

export type CommandCredits = EarnCredits | UseCredits | EarnDelayedCredit;

export enum EventTypeCredit {
  CREDITS_EARNED = "CREDITS_EARNED",
  CREDITS_USED = "CREDITS_USED",
  CREDITS_SCHEDULED = "CREDITS_SCHEDULED",
  CREDITS_ERROR = "CREDITS_ERROR",
}

export type CreditsEarned = Message<
  EventTypeCredit.CREDITS_EARNED,
  {
    id: string;
    amount: number;
    transactionId: string;
    delayed: Boolean;
    validationDate: Date;
  }
>;
export type CreditsUsed = Message<
  EventTypeCredit.CREDITS_USED,
  { id: string; amount: number; transactionId: string; delayed: Boolean }
>;
export type CreditsScheduled = Message<
  EventTypeCredit.CREDITS_SCHEDULED,
  {
    id: string;
    amount: number;
    transactionId: string;
    validationDate: Date;
    delayed: Boolean;
  }
>;

export type CreditsError = Message<
  EventTypeCredit.CREDITS_ERROR,
  { id: string; type: string }
>;

export type EventCredits =
  | CreditsEarned
  | CreditsUsed
  | CreditsError
  | CreditsScheduled;
