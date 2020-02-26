<template>
  <div v-show="orientation.isActive">
    <PanelButton name="Delete Quaternion" @click="orientation.deleteQuaternionBbox" />
    <PanelToggle name="Auto Select Color" v-model="orientation.color.auto" />
    <PanelToggle
      v-show="orientation.color.auto"
      name="Only Black or White"
      v-model="orientation.color.blackOrWhite"
    />
    <PanelInputString
      name="Stroke Color"
      v-model="orientation.polygon.pathOptions.strokeColor"
    />
  </div>
</template>

<script>
import PanelButton from "@/components/PanelButton";
import PanelToggle from "@/components/PanelToggle";
import PanelInputString from "@/components/PanelInputString";
import PanelInputNumber from "@/components/PanelInputNumber";

export default {
  name: "QuaternionPanel",
  components: { PanelButton, PanelToggle, PanelInputString, PanelInputNumber },
  props: {
    orientation: {
      type: Object,
      required: true
    }
  }
};
</script>
