import assert from "node:assert/strict";
// @ts-expect-error Bun is the test runner; its global types are not installed.
import { test } from "bun:test";
import { copyDeliveryContents, formatDeliveryContentsForCopy } from "../../lib/delivery-copy";

test("one delivery item is copied verbatim", async () => {
  let copied = "";
  await copyDeliveryContents(["  CARD-0001:secret  "], async (text) => { copied = text; });
  assert.equal(copied, "  CARD-0001:secret  ");
});

test("multiple delivery items are copied in order, separated by line breaks", async () => {
  const delivered = ["CARD-A\nPIN-123", "卡密 B", "https://example.com/activate?token=abcd"];
  let copied = "";
  await copyDeliveryContents(delivered, async (text) => { copied = text; });
  assert.equal(copied, "CARD-A\nPIN-123\n卡密 B\nhttps://example.com/activate?token=abcd");
  assert.deepEqual(delivered, ["CARD-A\nPIN-123", "卡密 B", "https://example.com/activate?token=abcd"]);
});

test("empty content cannot trigger a write", async () => {
  let called = false;
  await assert.rejects(copyDeliveryContents([], async () => { called = true; }), /DELIVERY_CONTENT_EMPTY/);
  assert.equal(called, false);
  assert.equal(formatDeliveryContentsForCopy([]), "");
});

test("clipboard write errors propagate for user-facing error feedback", async () => {
  await assert.rejects(
    copyDeliveryContents(["CONFIDENTIAL"], async () => { throw new Error("NotAllowedError"); }),
    /NotAllowedError/,
  );
});
