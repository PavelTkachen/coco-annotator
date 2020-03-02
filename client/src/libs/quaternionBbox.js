import paper from "paper";

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
class Point {
  constructor(point) {
    this.x = point.x;
    this.y = point.y;
  }
}

export class QuaternionBbox {
  constructor(point) {
    this.point1 = new Point(point); //one corner point.
    this.point2 = null;
    const context = {
      quaternions: [],
      actualQuaternion: [],
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
    };
  }

  createOrientation(point) {
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
    context.circle_big = new paper.Path.Circle(
      new paper.Point(context.offset_x, context.offset_y),
      150
    );
    context.circle_big.fillColor = "black";
    context.circle_big.opacity = 0;
    context.circle_big.selected = true;
    context.circle_big.data.type = "orientation";

    let group = {
      children: [
        context.circle_big,
        context.circle_small,
        context.z_axis,
        context.x_axis,
        context.y_axis
      ],
      data: {}
    };
    group.children.forEach(child => {
      child.data.type = "orientation";
    });
    // group.position = new paper.Point(context.offset_x, context.offset_y);
    context.group = group;
    context.group.data.group = group;
    context.group.data.groups = context.quaternions;
    context.group.data.select = this.select.bind(this);
    context.group.data.deSelect = this.deSelect.bind(this);
    context.group.data.actualQuaternion = context.actualQuaternion;
    return group;
  }

  addPoint(point) {
    this.point2 = new Point(point);
    this.point1_2 = new Point({ x: this.point1.x, y: this.point2.y });
    this.point2_1 = new Point({ x: this.point2.x, y: this.point1.y });
    this.point3 = new Point({
      x: (this.point2.x + this.point1.x) / 2,
      y: (this.point2.y + this.point1.y) / 2
    });
    this.createOrientation();
  }

  getCenter() {
    var center = this.point3;
    return center;
  }

  modifyPoint(point) {
    this.point2 = null;
    this.addPoint(point);
  }

  getPoints() {
    if (!this.isComplete()) {
      return [this.point1];
    }
    var points = [];
    points[0] = this.point1;
    points[1] = this.point1_2;
    points[2] = this.point2;
    points[3] = this.point2_1;
    points[4] = this.point1;
    return points;
  }

  removePoint() {
    this.point2 = null;
    this.point1_2 = null;
    this.point2_1 = null;
  }

  isComplete() {
    return !!this.point2;
  }
}
