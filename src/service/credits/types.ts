import type { Message } from "@keix/message-store-client";

export enum CommandTypeCredit {
  EARN_CREDITS = "EARN_CREDITS",
  USE_CREDITS = "USE_CREDITS",
}

export type EarnCredits = Message<
  CommandTypeCredit.EARN_CREDITS,
  { id: string; amount: number; transactionId?: string }
>;
export type UseCredits = Message<
  CommandTypeCredit.USE_CREDITS,
  { id: string; amount: number; transactionId?: string }
>;

export type CommandCredits = EarnCredits | UseCredits;

export enum EventTypeCredit {
  CREDITS_EARNED = "CREDITS_EARNED",
  CREDITS_USED = "CREDITS_USED",
  CREDITS_ERROR = "CREDITS_ERROR",
}

export type CreditsEarned = Message<
  EventTypeCredit.CREDITS_EARNED,
  { id: string; amount: number; transactionId: string }
>;
export type CreditsUsed = Message<
  EventTypeCredit.CREDITS_USED,
  { id: string; amount: number; transactionId: string }
>;
export type CreditsError = Message<
  EventTypeCredit.CREDITS_ERROR,
  { id: string; type: string }
>;

export type EventCredits = CreditsEarned | CreditsUsed | CreditsError;
