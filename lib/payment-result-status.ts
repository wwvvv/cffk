export type PaymentResultOrderState = {
  paymentStatus: "UNPAID" | "PAID" | "FAILED";
  deliveryStatus: "NOT_DELIVERED" | "DELIVERING" | "DELIVERED" | "FAILED";
  isAutomaticDelivery: boolean;
};

export const UNPAID_POLL_INTERVAL_MS = 10_000;
export const AUTOMATIC_DELIVERY_POLL_INTERVAL_MS = 10_000;
export const MANUAL_DELIVERY_POLL_INTERVAL_MS = 30_000;
export const PAYMENT_RESULT_POLL_MAX_MS = 5 * 60_000;

export function isAwaitingOrderUpdate(order: PaymentResultOrderState) {
  return order.paymentStatus === "UNPAID"
    || (order.paymentStatus === "PAID"
      && order.deliveryStatus !== "DELIVERED"
      && order.deliveryStatus !== "FAILED");
}

export function nextPaymentResultPollDelay(order: PaymentResultOrderState, elapsedMs: number): number | null {
  if (!isAwaitingOrderUpdate(order) || elapsedMs >= PAYMENT_RESULT_POLL_MAX_MS) return null;
  if (order.paymentStatus === "UNPAID") return UNPAID_POLL_INTERVAL_MS;
  return order.isAutomaticDelivery ? AUTOMATIC_DELIVERY_POLL_INTERVAL_MS : MANUAL_DELIVERY_POLL_INTERVAL_MS;
}

export function paymentResultNotice(order: PaymentResultOrderState, pollingExpired: boolean): string {
  if (order.paymentStatus === "UNPAID") {
    return pollingExpired
      ? "支付仍未确认，自动查询已暂停。请点击刷新状态，或稍后打开订单查询。"
      : "正在等待支付结果，页面会定期自动查询订单状态。";
  }
  if (order.paymentStatus === "FAILED") return "支付未完成，请返回订单查询查看详情。";
  if (order.deliveryStatus === "DELIVERED") return "订单已发货，可在下方查看交付内容，或前往订单中心查看详情。";
  if (order.deliveryStatus === "FAILED") return "支付成功，但发货遇到问题，请联系商家处理。";
  if (pollingExpired) return order.isAutomaticDelivery
    ? "支付成功，自动发货仍未完成。自动查询已暂停，请手动刷新或稍后查看订单。"
    : "支付成功，等待商家发货。自动查询已暂停，请手动刷新或稍后查看订单。";
  return order.isAutomaticDelivery
    ? "支付成功，正在自动发货，页面会自动更新发货进度。"
    : "支付成功，等待商家发货，页面会定期查询发货状态。";
}
