// Epay's "type" parameter is sent unchanged. Merchants enable only the supported subset.
export const EPAY_CHANNELS = [
  { label: "支付宝", value: "alipay" },
  { label: "微信支付", value: "wxpay" },
  { label: "京东支付", value: "jdpay" },
  { label: "QQ 钱包", value: "qqpay" },
  { label: "银联支付", value: "bank" },
  { label: "抖音支付", value: "douyinpay" },
  { label: "PayPal", value: "paypal" },
] as const;

export type EpayChannel = (typeof EPAY_CHANNELS)[number]["value"];
export const EPAY_CHANNEL_VALUES: readonly EpayChannel[] = EPAY_CHANNELS.map(({ value }) => value);
