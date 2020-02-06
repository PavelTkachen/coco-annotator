<template>
  <div v-show="quaternion.isActive">
    <PanelButton name="Delete Quaternion" @click="quaternion.deleteQuaternionBbox" />
    <PanelToggle name="Auto Select Color" v-model="quaternion.color.auto" />
    <PanelToggle
      v-show="quaternion.color.auto"
      name="Only Black or White"
      v-model="quaternion.color.blackOrWhite"
    />
    <PanelInputString
      name="Stroke Color"
      v-model="quaternion.polygon.pathOptions.strokeColor"
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
    quaternion: {
      type: Object,
      required: true
    }
  }
};
</script>
