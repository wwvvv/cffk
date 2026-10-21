/** Preserve each delivered item exactly as displayed, separating items with newlines. */
export function formatDeliveryContentsForCopy(contents: readonly string[]): string {
  return contents.join("\n");
}

export async function copyDeliveryContents(
  contents: readonly string[],
  writeText: (text: string) => Promise<void>,
): Promise<void> {
  if (!contents.length) throw new Error("DELIVERY_CONTENT_EMPTY");
  await writeText(formatDeliveryContentsForCopy(contents));
}
