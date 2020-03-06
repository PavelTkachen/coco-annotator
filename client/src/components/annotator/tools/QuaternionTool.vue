<script>
import paper from "paper";
import tool from "@/mixins/toolBar/tool";

import { invertColor } from "@/libs/colors";
import { QuaternionBBox } from "@/libs/quaternion";
import { mapMutations } from "vuex";

export default {
  name: "QuaternionTool",
  mixins: [tool],
  props: {
    scale: {
      type: Number,
      default: 1
    },
    settings: {
      type: [Object, null],
      default: null
    }
  },
  data() {
    return {
      icon: "fa-map-o",
      name: "QuaternionBBox",
      scaleFactor: 3,
      cursor: "copy",
      orientation: null,
      action: false,
      polygon: {
        path: null,
        guidance: true,
        pathOptions: {
          strokeColor: "black",
          strokeWidth: 1
        }
      },
      color: {
        blackOrWhite: true,
        auto: true,
        radius: 10,
        circle: null
      },
      actionTypes: Object.freeze({
        ADD_POINTS: "Added Points",
        CLOSED_POLYGON: "Closed Polygon",
        DELETE_POLYGON: "Delete Polygon"
      }),
      actionPoints: 0
    };
  },
  methods: {
    ...mapMutations(["addUndo", "removeUndos"]),
    export() {
      return {
        completeDistance: this.polygon.completeDistance,
        minDistance: this.polygon.minDistance,
        blackOrWhite: this.color.blackOrWhite,
        auto: this.color.auto,
        radius: this.color.radius
      };
    },
    createOrientationBBox(event) {
      let id = this.$parent.currentAnnotation.annotation.id;
      this.orientation = new QuaternionBBox(event.point, id);
      this.polygon.path = this.orientation.data.path;
    },
    modifyOrientationBBox(event) {
      this.orientation.resize(event.point);
    },
    autoStrokeColor(point) {
      if (this.color.circle == null) return;
      if (this.polygon.path == null) return;
      if (!this.color.auto) return;

      this.color.circle.position = point;
      let raster = this.$parent.image.raster;
      let color = raster.getAverageColor(this.color.circle);
      if (color) {
        this.polygon.pathOptions.strokeColor = invertColor(
          color.toCSS(true),
          this.color.blackOrWhite
        );
      }
    },
    checkAnnotationExist() {
      return (
        !!this.$parent.currentAnnotation &&
        !!this.$parent.currentAnnotation.annotation.paper_object.length
      );
    },
    onMouseDown(event) {
      if (this.polygon.path == null && this.checkAnnotationExist()) {
        this.$parent.currentCategory.createAnnotation();
      }
      this.createOrientationBBox(event);
    },
    onMouseDrag(event) {
      this.orientation.resize(event.point);
    },
    onMouseUp() {
      this.$parent.currentCategory.createAnnotation();
      if (this.completeBBox()) return;
    },
    deleteQuaternionBbox() {
      if (this.polygon.path == null) return;
      this.orientation.remove();
    },
    completeBBox() {
      if (this.polygon.path == null) return false;

      this.polygon.path.fillColor = "black";
      this.polygon.path.closePath();

      this.$parent.uniteCurrentAnnotation(this.polygon.path, true, true, true);

      this.polygon.path.remove();
      this.polygon.path = null;
      if (this.color.circle) {
        this.color.circle.remove();
        this.color.circle = null;
      }

      this.removeUndos(this.actionTypes.ADD_POINTS);

      return true;
    }
  },
  computed: {
    isDisabled() {
      return this.$parent.current.annotation === -1;
    }
  },
  watch: {
    isActive(active) {
      if (active) {
        this.tool.activate();
        localStorage.setItem("editorTool", this.name);
      }
    },
    /**
     * Change width of stroke based on zoom of image
     */
    scale(newScale) {
      this.polygon.pathOptions.strokeWidth = newScale * this.scaleFactor;
      if (this.polygon.path != null)
        this.polygon.path.strokeWidth = newScale * this.scaleFactor;
    },
    "polygon.pathOptions.strokeColor"(newColor) {
      if (this.polygon.path == null) return;

      this.polygon.path.strokeColor = newColor;
    },
    "color.auto"(value) {
      if (value && this.polygon.path) {
        this.color.circle = new paper.Path.Rectangle(
          new paper.Point(0, 0),
          new paper.Size(10, 10)
        );
      }
      if (!value && this.color.circle) {
        this.color.circle.remove();
        this.color.circle = null;
      }
    }
  },
  created() {},
  mounted() {}
};
</script>
