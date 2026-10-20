type PaymentChannelNames = Record<string, string> & {
  alipay: string;
  alipayFaceToFace: string;
};

export function formatPaymentMethodLabel(
  method: { provider: string; name: string; channel?: string },
  names: PaymentChannelNames,
) {
  if (!method.channel) return method.name;
  // Alipay's "web" mode is a payment flow, not the payment brand.
  const label = method.provider === "ALIPAY"
    ? (method.channel === "face_to_face" ? names.alipayFaceToFace : names.alipay)
    : (names[method.channel === "face_to_face" ? "faceToFace" : method.channel] ?? method.channel);
  return `${label}（${method.name}）`;
}
