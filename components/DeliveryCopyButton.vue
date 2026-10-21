<template>
  <Button
    type="button"
    variant="outline"
    size="sm"
    :disabled="copying || contents.length === 0"
    :aria-label="contents.length > 1 ? '复制全部发货内容' : '复制发货内容'"
    @click="copy"
  >
    <CopyIcon class="size-4" aria-hidden="true" />
    {{ contents.length > 1 ? "复制全部" : "复制" }}
  </Button>
</template>

<script setup lang="ts">
import { ref } from "vue";
import { CopyIcon } from "@lucide/vue";
import { toast } from "vue-sonner";
import { Button } from "@/components/ui/button";
import { copyDeliveryContents } from "@/lib/delivery-copy";

const props = defineProps<{ contents: readonly string[] }>();
const copying = ref(false);

async function copy() {
  if (copying.value || !props.contents.length) return;
  copying.value = true;
  try {
    await copyDeliveryContents(props.contents, (text) => {
      if (!navigator.clipboard?.writeText) throw new Error("CLIPBOARD_UNAVAILABLE");
      return navigator.clipboard.writeText(text);
    });
    toast.success("发货内容已复制。");
  } catch {
    toast.error("复制失败，请手动选中发货内容复制。");
  } finally {
    copying.value = false;
  }
}
</script>
