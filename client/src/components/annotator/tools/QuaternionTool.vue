<script>
import paper from "paper";
import tool from "@/mixins/toolBar/tool";

import { invertColor } from "@/libs/colors";
import { QuaternionBBox } from "@/libs/quaternion";
import { BBox } from "@/libs/bbox";
import { mapMutations } from "vuex";

const unit = Object.freeze([1, 0, 0, 0]);

function norm(vec) {
  return vec.reduce(function(s, e) {
    return s + e * e;
  }, 0);
}

function distance(vec) {
  return Math.sqrt(norm(vec));
}

function normalize(vec) {
  var dist = distance(vec);
  // assert(dist !== 0);
  return vec.map(function(e) {
    return e / dist;
  });
}

function mult(a, b) {
  return [
    a[0] * b[0] - a[1] * b[1] - a[2] * b[2] - a[3] * b[3],
    a[0] * b[1] + a[1] * b[0] + a[2] * b[3] - a[3] * b[2],
    a[0] * b[2] + a[2] * b[0] + a[3] * b[1] - a[1] * b[3],
    a[0] * b[3] + a[3] * b[0] + a[1] * b[2] - a[2] * b[1]
  ];
}

function a2q(axis, phi) {
  var cos = Math.cos(phi / 2);
  var sin = Math.sin(phi / 2);
  var normal = normalize(axis);
  return [cos, sin * normal[0], sin * normal[1], sin * normal[2]];
}

function rot(vec, q) {
  var qv0 = -q[1] * vec[0] - q[2] * vec[1] - q[3] * vec[2];
  var qv1 = q[0] * vec[0] + q[2] * vec[2] - q[3] * vec[1];
  var qv2 = q[0] * vec[1] + q[3] * vec[0] - q[1] * vec[2];
  var qv3 = q[0] * vec[2] + q[1] * vec[1] - q[2] * vec[0];
  var r1 = qv0 * -q[1] + qv1 * q[0] + qv2 * -q[3] - qv3 * -q[2];
  var r2 = qv0 * -q[2] + qv2 * q[0] + qv3 * -q[1] - qv1 * -q[3];
  var r3 = qv0 * -q[3] + qv3 * q[0] + qv1 * -q[2] - qv2 * -q[1];
  return [r1, r2, r3];
}

function def() {
  return a2q([1, 1, 0], 0.2);
}

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
      orientationBbox: null,
      context: {
        itemId: null,
        orientations: [],
        offset_x: null,
        offset_y: null,
        group: null,
        difference: {},
        q: def(),
        tf: unit,
        circle_small: null,
        circle_big: null,
        z_axis: null,
        x_axis: null,
        y_axis: null,
        flag: false,
        begin: null
      },
      polygon: {
        path: null,
        guidance: true,
        pathOptions: {
          strokeColor: "black",
          strokeWidth: 1
        }
      },
      orientation: {
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
        orientationBbox: this.orientationBbox,
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
    getDist(pointEvent, pointBegin) {
      let length = Math.sqrt(
        Math.pow(pointBegin.x - pointEvent.x, 2) +
          Math.pow(pointBegin.y - pointEvent.y, 2)
      );
      return length / 100.0;
    },
    updateOffset(x, y) {
      let context = this.context;
      context.offset_x = x;
      context.offset_y = y;
    },
    deSelect() {
      let context = this.context;
      context.group.onMouseDown = function() {
        context.group.removeChildren(4);
      };
    },
    select(id) {
      let context = this.context;
      let unit_x = [1, 0, 0];
      let unit_y = [0, 0, 1];
      let unit_z = [0, 1, 0];
      if (context.group.children.length !== 5) {
        context.circle_big = new paper.Path.Circle(
          new paper.Point(context.offset_x, context.offset_y),
          150
        );
        context.circle_big.fillColor = "black";
        context.circle_big.opacity = 0;
        context.circle_big.data.type = "orientation";
        context.group.addChild(context.circle_big);
      }
      context.group.onMouseDown = function(event) {
        context.begin = event.point;
        context.flag = true;
      };
      context.group.onMouseMove = function(event) {
        if (context.flag) {
          let xZnak = context.begin.x - event.point.x;
          let yZnak = context.begin.y - event.point.y;
          let sum = xZnak + yZnak;
          let diff = this.getDist(event.point, context.begin);
          diff = sum < 0 ? -diff : diff;
          if (event.modifiers.control) {
            context.tf = a2q(unit_x, diff);
          } else if (event.modifiers.shift) {
            context.tf = a2q(unit_y, diff);
          } else {
            context.tf = a2q(unit_z, diff);
          }
          let tq = mult(context.q, context.tf);
          let x = rot([1, 0, 0], tq);
          let y = rot([0, 1, 0], tq);
          let z = rot([0, 0, 1], tq);
          let draw_x = new paper.Point(
            x[0] * 100 + context.offset_x,
            x[1] * 100 + context.offset_y
          );
          let draw_y = new paper.Point(
            y[0] * 100 + context.offset_x,
            y[1] * 100 + context.offset_y
          );
          let draw_z = new paper.Point(
            z[0] * 100 + context.offset_x,
            z[1] * 100 + context.offset_y
          );
          context.z_axis.removeSegment(1);
          context.z_axis.add(draw_y);

          context.x_axis.removeSegment(1);
          context.x_axis.add(draw_x);

          context.y_axis.removeSegment(1);
          context.y_axis.add(draw_z);
        }
        context.actualQuaternion = context.q;
      }.bind(this);

      context.group.onMouseUp = function() {
        context.q = mult(context.q, context.tf);
        context.tf = unit;
        context.flag = false;
      }.bind(this);
      context.group.onMouseOut = function() {
        context.flag = false;
      }.bind(this);
      this.orientationBbox = context.actualQuaternion;
    },
    createGroup(point) {
      let context = this.context;
      context.offset_x = point.x;
      context.offset_y = point.y;
      let tq = context.q;
      let x = rot([1, 0, 0], tq);
      let y = rot([0, 1, 0], tq);
      let z = rot([0, 0, 1], tq);

      let draw_x = [x[0] * 100, x[1] * 100];
      let draw_y = [y[0] * 100, y[1] * 100];
      let draw_z = [z[0] * 100, z[1] * 100];

      context.z_axis = new paper.Path(
        [context.offset_x, context.offset_y],
        [context.offset_x - draw_x[0], context.offset_y - draw_x[1]]
      );
      context.z_axis.strokeColor = "green";
      context.z_axis.strokeWidth = 3;
      context.z_axis.selected = false;

      context.x_axis = new paper.Path(
        [context.offset_x, context.offset_y],
        [context.offset_x - draw_y[0], context.offset_y - draw_y[1]]
      );
      context.x_axis.strokeColor = "red";
      context.x_axis.strokeWidth = 3;
      context.x_axis.selected = false;

      context.y_axis = new paper.Path(
        [context.offset_x, context.offset_y],
        [draw_z[0] + context.offset_x, draw_z[1] + context.offset_y]
      );
      context.y_axis.strokeColor = "blue";
      context.y_axis.strokeWidth = 3;
      context.y_axis.selected = false;

      context.circle_small = new paper.Path.Circle(
        new paper.Point(context.offset_x, context.offset_y),
        10
      );
      context.circle_small.fillColor = "red";
      context.circle_small.selected = false;

      let group = new paper.Group([
        context.circle_small,
        context.z_axis,
        context.x_axis,
        context.y_axis
      ]);
      group.children.forEach(child => {
        child.data.type = "orientation";
      });
      context.group = group;
      context.group.data.group = group;
      context.group.data.select = this.select.bind(this);
      context.group.data.deSelect = this.deSelect.bind(this);
      context.group.data.updateOffset = this.updateOffset.bind(this);
      context.group.data.orientations = context.orientations;
      context.group.data.annotationId = this.$parent.current.annotation;
      context.group.data.categoryId = this.$parent.current.category;

      return group;
    },
    createBBox(event) {
      this.polygon.path = new paper.Path(this.polygon.pathOptions);
      this.bbox = new BBox(event.point);
      this.bbox.getPoints().forEach(point => this.polygon.path.add(point));
    },
    modifyBBox(event) {
      this.polygon.path = new paper.Path(this.polygon.pathOptions);
      this.bbox.modifyPoint(event.point);
      this.bbox.getPoints().forEach(point => this.polygon.path.add(point));
    },

    createQuaternionBBox() {
      this.orientation.path = this.createGroup(this.bbox.getPoints()[0]);
    },
    modifyQuaternionBBox() {
      this.orientation.path = this.createGroup(this.bbox.getPoints()[5]);
    },

    /**
     * Frees current orientationBbox
     */
    deleteQuaternionBbox() {
      if (this.polygon.path == null) return;
      this.polygon.path.remove();
      this.polygon.path = null;

      if (this.orientation.path == null) return;
      this.orientation.path.remove();
      this.orientation.path = null;

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

      if (this.completeBBox()) {
        let context = this.context;
        const current = this.$parent.current;
        const categoryId = current.category;
        const annotationId = current.annotation;
        context.itemId = this.$parent.categories[categoryId].annotations[
          annotationId
        ].id;
        this.orientationBbox = {
          data: context.q,
          id: context.itemId
        };
        context.orientations.push(this.orientationBbox);
        return;
      }
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
      let lengthQuaternion = this.orientation.path.children.length;
      this.polygon.path.removeSegments(length - points, length);
      this.orientation.path.removeChildren(
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
      this.orientation.path.removeChildren();
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
