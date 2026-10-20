import assert from "node:assert/strict";
import { createHash } from "node:crypto";
// @ts-expect-error This project runs its tests in Bun without Bun global types.
import { test } from "bun:test";
import { EPAY_CHANNELS, EPAY_CHANNEL_VALUES } from "../../lib/epay-channels";
import { formatPaymentMethodLabel } from "../../lib/payment-method-label";
import { parseEpayConfig } from "../../lib/config-schemas";
import zhCN from "../../lib/i18n/zh-CN";
import enUS from "../../lib/i18n/en-US";
import { createProviderAdapter } from "../../server/payment/providers";
import { paymentProviderDefinitions, parseProviderConfig } from "../../server/payment/registry";

const base = {
  schemaVersion: 1 as const,
  baseUrl: "https://epay.example",
  pid: "1000",
  key: "test-only-key",
  epayChannels: ["alipay", "wxpay", "jdpay", "qqpay", "bank", "douyinpay", "paypal"],
  notifyUrl: "https://shop.example/api/payments/epay/notify",
  returnUrl: "https://shop.example/payment-result",
};

test("Epay form and schema expose the same optional channel set", () => {
  const field = paymentProviderDefinitions.EPAY.fields.find((item) => item.key === "epayChannels");
  assert.deepEqual(field?.options, [...EPAY_CHANNELS]);
  assert.deepEqual(EPAY_CHANNEL_VALUES, base.epayChannels);
  assert.deepEqual(parseEpayConfig(JSON.stringify(base)).epayChannels, base.epayChannels);
  assert.deepEqual((parseProviderConfig("EPAY", JSON.stringify(base)) as typeof base).epayChannels, base.epayChannels);
  assert.deepEqual(paymentProviderDefinitions.EPAY.defaults.epayChannels, ["alipay", "wxpay"], "existing defaults stay unchanged");
  assert.throws(() => parseEpayConfig(JSON.stringify({ ...base, epayChannels: ["unknown"] })), /unsupported value/);
});

test("Epay adapter sends every enabled channel unchanged and retains signed payloads", async () => {
  const adapter = createProviderAdapter("EPAY", base);
  for (const channel of EPAY_CHANNEL_VALUES) {
    const payment = await adapter.create({
      orderNo: "ORDER-" + channel,
      amount: 1234,
      subject: "Test item",
      channel,
      notifyUrl: base.notifyUrl,
      returnUrl: base.returnUrl,
    });
    assert.equal(payment.mode, "redirect");
    const url = new URL(payment.url!);
    assert.equal(url.pathname, "/submit.php");
    assert.equal(url.searchParams.get("type"), channel);
    assert.equal(url.searchParams.get("money"), "12.34");
    const values = Object.fromEntries([...url.searchParams].filter(([name]) => name !== "sign" && name !== "sign_type"));
    const input = Object.entries(values).filter(([, value]) => value !== "").sort(([a], [b]) => a.localeCompare(b)).map(([k, v]) => `${k}=${v}`).join("&");
    assert.equal(url.searchParams.get("sign"), createHash("md5").update(input + base.key).digest("hex"));
  }
});

test("Epay adapter never rewrites invalid or disabled channels to Alipay", async () => {
  const adapter = createProviderAdapter("EPAY", { ...base, epayChannels: ["jdpay"] });
  const input = { orderNo: "ORDER-1", amount: 2500, subject: "Test", notifyUrl: base.notifyUrl, returnUrl: base.returnUrl };
  const first = await adapter.create(input);
  assert.equal(new URL(first.url!).searchParams.get("type"), "jdpay");
  await assert.rejects(adapter.create({ ...input, channel: "alipay" }), /PAYMENT_CHANNEL_INVALID/);
  await assert.rejects(adapter.create({ ...input, channel: "unsupported" as "alipay" }), /PAYMENT_CHANNEL_INVALID/);
});

test("payment method names put the payment method before provider name", () => {
  const zh = zhCN.productCheckout.paymentChannels;
  const en = enUS.productCheckout.paymentChannels;
  assert.equal(formatPaymentMethodLabel({ provider: "EPAY", channel: "alipay", name: "官方" }, zh), "支付宝（官方）");
  assert.equal(formatPaymentMethodLabel({ provider: "EPAY", channel: "jdpay", name: "易支付" }, zh), "京东支付（易支付）");
  assert.equal(formatPaymentMethodLabel({ provider: "EPAY", channel: "bank", name: "易支付" }, zh), "银联支付（易支付）");
  assert.equal(formatPaymentMethodLabel({ provider: "EPAY", channel: "qqpay", name: "易支付" }, zh), "QQ 钱包（易支付）");
  assert.equal(formatPaymentMethodLabel({ provider: "ALIPAY", channel: "web", name: "官方" }, zh), "支付宝（官方）");
  assert.equal(formatPaymentMethodLabel({ provider: "ALIPAY", channel: "face_to_face", name: "官方" }, zh), "支付宝当面付（官方）");
  assert.equal(formatPaymentMethodLabel({ provider: "STRIPE", name: "Stripe" }, zh), "Stripe");
  assert.equal(formatPaymentMethodLabel({ provider: "EPAY", channel: "jdpay", name: "Epay" }, en), "JD Pay（Epay）");
});
