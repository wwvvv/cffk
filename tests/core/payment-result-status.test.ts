import assert from "node:assert/strict";
// @ts-expect-error Tests use Bun without Bun's global type package.
import { test } from "bun:test";
import {
  AUTOMATIC_DELIVERY_POLL_INTERVAL_MS,
  MANUAL_DELIVERY_POLL_INTERVAL_MS,
  PAYMENT_RESULT_POLL_MAX_MS,
  UNPAID_POLL_INTERVAL_MS,
  isAwaitingOrderUpdate,
  nextPaymentResultPollDelay,
  paymentResultNotice,
  type PaymentResultOrderState,
} from "../../lib/payment-result-status";

const unpaid: PaymentResultOrderState = {
  paymentStatus: "UNPAID", deliveryStatus: "NOT_DELIVERED", isAutomaticDelivery: false,
};
const autoPaid: PaymentResultOrderState = {
  paymentStatus: "PAID", deliveryStatus: "NOT_DELIVERED", isAutomaticDelivery: true,
};
const manualPaid: PaymentResultOrderState = {
  paymentStatus: "PAID", deliveryStatus: "NOT_DELIVERED", isAutomaticDelivery: false,
};

test("payment result polling stays within the guest query rate limit", () => {
  assert.equal(nextPaymentResultPollDelay(unpaid, 0), UNPAID_POLL_INTERVAL_MS);
  assert.ok(UNPAID_POLL_INTERVAL_MS >= 10_000);
  assert.equal(nextPaymentResultPollDelay(autoPaid, 0), AUTOMATIC_DELIVERY_POLL_INTERVAL_MS);
  assert.equal(nextPaymentResultPollDelay(manualPaid, 0), MANUAL_DELIVERY_POLL_INTERVAL_MS);
  assert.ok(MANUAL_DELIVERY_POLL_INTERVAL_MS >= UNPAID_POLL_INTERVAL_MS);
});

test("payment result follows delivery after payment, but stops on terminal states", () => {
  assert.equal(isAwaitingOrderUpdate(autoPaid), true);
  assert.equal(isAwaitingOrderUpdate(manualPaid), true);
  assert.equal(nextPaymentResultPollDelay({ ...autoPaid, deliveryStatus: "DELIVERING" }, 15_000), AUTOMATIC_DELIVERY_POLL_INTERVAL_MS);
  for (const deliveryStatus of ["DELIVERED", "FAILED"] as const) {
    const completed = { ...autoPaid, deliveryStatus };
    assert.equal(isAwaitingOrderUpdate(completed), false);
    assert.equal(nextPaymentResultPollDelay(completed, 0), null);
  }
  const failedPayment = { ...unpaid, paymentStatus: "FAILED" as const };
  assert.equal(isAwaitingOrderUpdate(failedPayment), false);
  assert.equal(nextPaymentResultPollDelay(failedPayment, 0), null);
});

test("polling is bounded and the notice does not promise polling after timeout", () => {
  assert.equal(nextPaymentResultPollDelay(unpaid, PAYMENT_RESULT_POLL_MAX_MS), null);
  assert.equal(nextPaymentResultPollDelay(autoPaid, PAYMENT_RESULT_POLL_MAX_MS), null);
  assert.equal(nextPaymentResultPollDelay(manualPaid, PAYMENT_RESULT_POLL_MAX_MS), null);
  assert.match(paymentResultNotice(autoPaid, true), /自动查询已暂停/);
  assert.match(paymentResultNotice(manualPaid, true), /自动查询已暂停/);
  assert.match(paymentResultNotice(unpaid, true), /自动查询已暂停/);
});

test("paid but manually undelivered is not described as an unconfirmed payment", () => {
  const notice = paymentResultNotice(manualPaid, false);
  assert.match(notice, /支付成功，等待商家发货/);
  assert.doesNotMatch(notice, /支付通知/);
  assert.match(paymentResultNotice(autoPaid, false), /正在自动发货/);
  assert.match(paymentResultNotice({ ...autoPaid, deliveryStatus: "DELIVERED" }, false), /已发货/);
  assert.match(paymentResultNotice({ ...autoPaid, deliveryStatus: "FAILED" }, false), /发货遇到问题/);
  assert.match(paymentResultNotice(unpaid, false), /等待支付结果/);
});
