<script>
import paper from "paper";
import tool from "@/mixins/toolBar/tool";

import { invertColor } from "@/libs/colors";
import { QuaternionBBox } from "@/libs/quaternion";
import { BBox } from "@/libs/bbox";
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
      quaternionBbox: null,
      polygon: {
        path: null,
        guidance: true,
        pathOptions: {
          strokeColor: "black",
          strokeWidth: 1
        }
      },
      quaternion: {
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
    setPreferences(pref) {
      this.color.blackOrWhite = pref.blackOrWhite || this.color.blackOrWhite;
      this.color.auto = pref.auto || this.color.auto;
      this.color.radius = pref.radius || this.color.radius;
    },

    norm(vec) {
      return vec.reduce(function(s, e) {
        return s + e * e;
      }, 0);
    },
    distance(vec) {
      return Math.sqrt(this.norm(vec));
    },

    normalize(vec) {
      var dist = this.distance(vec);
      // assert(dist !== 0);
      return vec.map(function(e) {
        return e / dist;
      });
    },

    mult(a, b) {
      return [
        a[0] * b[0] - a[1] * b[1] - a[2] * b[2] - a[3] * b[3],
        a[0] * b[1] + a[1] * b[0] + a[2] * b[3] - a[3] * b[2],
        a[0] * b[2] + a[2] * b[0] + a[3] * b[1] - a[1] * b[3],
        a[0] * b[3] + a[3] * b[0] + a[1] * b[2] - a[2] * b[1]
      ];
    },

    a2q(axis, phi) {
      var cos = Math.cos(phi / 2);
      var sin = Math.sin(phi / 2);
      var normal = this.normalize(axis);
      return [cos, sin * normal[0], sin * normal[1], sin * normal[2]];
    },

    rot(vec, q) {
      var qv0 = -q[1] * vec[0] - q[2] * vec[1] - q[3] * vec[2];
      var qv1 = q[0] * vec[0] + q[2] * vec[2] - q[3] * vec[1];
      var qv2 = q[0] * vec[1] + q[3] * vec[0] - q[1] * vec[2];
      var qv3 = q[0] * vec[2] + q[1] * vec[1] - q[2] * vec[0];
      var r1 = qv0 * -q[1] + qv1 * q[0] + qv2 * -q[3] - qv3 * -q[2];
      var r2 = qv0 * -q[2] + qv2 * q[0] + qv3 * -q[1] - qv1 * -q[3];
      var r3 = qv0 * -q[3] + qv3 * q[0] + qv1 * -q[2] - qv2 * -q[1];
      return [r1, r2, r3];
    },

    init(point) {
      let def = () => this.a2q([1, 1, 0], 0.2);
      let q = def();
      let tf = Object.freeze([1, 0, 0, 0]);

      let offset_x = point.x;
      let offset_y = point.y;
      let tq = this.mult(q, tf);
      let x = this.rot([1, 0, 0], tq);
      let y = this.rot([0, 1, 0], tq);
      let z = this.rot([0, 0, 1], tq);

      let draw_x = [x[0] * 100, x[1] * 100];
      let draw_y = [y[0] * 100, y[1] * 100];
      let draw_z = [z[0] * 100, z[1] * 100];

      let path = new paper.Path(
        [offset_x, offset_y],
        [offset_x - draw_x[0], offset_y - draw_x[1]]
      );
      path.strokeColor = "red";

      let path2 = new paper.Path(
        [offset_x, offset_y],
        [offset_x - draw_y[0], offset_y - draw_y[1]]
      );
      path2.strokeColor = "green";

      let path3 = new paper.Path(
        [offset_x, offset_y],
        [draw_z[0] + offset_x, draw_z[1] + offset_y]
      );
      path3.strokeColor = "blue";

      let circle = new paper.Path.Circle(
        new paper.Point(offset_x, offset_y),
        10
      );
      circle.strokeColor = "red";

      let circle1 = new paper.Path.Circle(
        new paper.Point(offset_x, offset_y),
        150
      );

      circle1.fillColor = "black";
      circle1.opacity = 0;
      let group = new paper.Group([path, path2, path3, circle, circle1]);
      return group;
    },

    createBBox(event) {
      this.polygon.path = new paper.Path(this.polygon.pathOptions);
      this.bbox = new BBox(event.point);
      this.bbox.getPoints().forEach(point => this.polygon.path.add(point));
    },

    createQuaternionBBox(event) {
      this.quaternion.path = this.init(event.point);
      this.quaternionBbox = new QuaternionBBox(event.point);
      this.quaternionBbox
        .getPoints()
        .forEach(point => this.polygon.path.add(point));
    },

    modifyQuaternionBBox(event) {
      this.quaternion.path = this.init(event.point);
    },

    modifyBBox(event) {
      this.polygon.path = new paper.Path(this.polygon.pathOptions);
      this.bbox.modifyPoint(event.point);
      this.bbox.getPoints().forEach(point => this.polygon.path.add(point));
    },
    /**
     * Frees current quaternionBbox
     */
    deleteQuaternionBbox() {
      if (this.polygon.path == null) return;
      this.polygon.path.remove();
      this.polygon.path = null;

      if (this.quaternion.path == null) return;
      this.quaternion.path.remove();
      this.quaternion.path = null;

      if (this.color.circle == null) return;
      this.color.circle.remove();
      this.color.circle = null;
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
      if (this.polygon.path == null) {
        this.createBBox(event);
        this.createQuaternionBBox(event);
        return;
      }
      this.removeLastBBox();
      this.modifyBBox(event);
      this.modifyQuaternionBBox(event);

      if (this.completeBBox()) return;
    },
    onMouseMove(event) {
      if (this.polygon.path == null) return;
      this.autoStrokeColor(event.point);
      this.removeLastBBox();
      this.modifyBBox(event);
      this.modifyQuaternionBBox(event);
    },
    /**
     * Undo points
     */
    undoPoints(args) {
      if (this.polygon.path == null) return;
      let points = args.points;
      let length = this.polygon.path.segments.length;
      let lengthQuaternion = this.quaternion.path.children.length;
      this.polygon.path.removeSegments(length - points, length);
      this.quaternion.path.removeChildren(
        lengthQuaternion - points,
        lengthQuaternion
      );
    },
    /**
     * Closes current polygon and unites it with current annotaiton.
     * @returns {boolean} sucessfully closes object
     */
    completeBBox() {
      if (this.polygon.path == null) return false;
      this.polygon.path.fillColor = "black";
      this.polygon.path.closePath();
      this.$parent.uniteCurrentAnnotation(
        this.polygon.path,
        true,
        true,
        true,
        true
      );
      this.polygon.path.remove();
      this.polygon.path = null;
      if (this.color.circle) {
        this.color.circle.remove();
        this.color.circle = null;
      }

      this.removeUndos(this.actionTypes.ADD_POINTS);

      return true;
    },
    removeLastBBox() {
      this.polygon.path.removeSegments();
      this.quaternion.path.removeChildren();
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
