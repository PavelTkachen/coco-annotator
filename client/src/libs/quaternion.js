import paper from "paper";
class Point {
  constructor(point) {
    this.x = point.x;
    this.y = point.y;
  }
}
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

export class QuaternionBBox {
  constructor(point, id) {
    this.point1 = new Point(point); //one corner point.
    this.point2 = new Point(point);
    this.point1_2 = new Point(point);
    this.point2_1 = new Point(point);
    this.pointCenter = new Point(point);
    this.data = {
      itemId: id,
      offset_x: null,
      offset_y: null,
      q: def(),
      tf: unit,
      circle_small: null,
      circle_big: null,
      z_axis: null,
      x_axis: null,
      y_axis: null,
      flag: false,
      begin: null,
      data: this
    };
    let data = this.data;
    data.offset_x = this.pointCenter.x;
    data.offset_y = this.pointCenter.y;
    data.q = def();
    let tq = data.q;
    let x = rot([1, 0, 0], tq);
    let y = rot([0, 1, 0], tq);
    let z = rot([0, 0, 1], tq);

    let draw_x = [x[0] * 100, x[1] * 100];
    let draw_y = [y[0] * 100, y[1] * 100];
    let draw_z = [z[0] * 100, z[1] * 100];

    this.path = new paper.Path({
      segments: [
        [point.x, point.y],
        [point.x, point.y],
        [point.x, point.y],
        [point.x, point.y]
      ],
      strokeColor: "black",
      closed: true
    });
    this.path.data.quaternionBbox = this;
    data.z_axis = new paper.Path(
      [this.pointCenter.x, this.pointCenter.y],
      [this.pointCenter.x - draw_x[0], this.pointCenter.y - draw_x[1]]
    );
    data.z_axis.strokeColor = "green";
    data.z_axis.strokeWidth = 3;

    data.x_axis = new paper.Path(
      [this.pointCenter.x, this.pointCenter.y],
      [this.pointCenter.x - draw_y[0], this.pointCenter.y - draw_y[1]]
    );
    data.x_axis.strokeColor = "red";
    data.x_axis.strokeWidth = 3;

    data.y_axis = new paper.Path(
      [this.pointCenter.x, this.pointCenter.y],
      [draw_z[0] + this.pointCenter.x, draw_z[1] + this.pointCenter.y]
    );
    data.y_axis.strokeColor = "blue";
    data.y_axis.strokeWidth = 3;

    data.circle_small = new paper.Path.Circle(
      new paper.Point(this.pointCenter.x, this.pointCenter.y),
      10
    );
    data.circle_small.fillColor = "red";

    data.circle_big = new paper.Path.Circle(
      new paper.Point(this.pointCenter.x, this.pointCenter.y),
      150
    );
    data.circle_big.fillColor = "black";
    data.circle_big.opacity = 0.2;
    data.circle_big.visible = false;
    this.group = new paper.Group([
      data.circle_small,
      data.circle_big,
      data.z_axis,
      data.x_axis,
      data.y_axis
    ]);
    this.group.children.forEach(child => {
      child.data.type = "orientation";
    });
    this.group.data.quaternionBbox = this;
    data.begin = point;
  }
  getDist(pointEvent, pointBegin) {
    let length = Math.sqrt(
      Math.pow(pointBegin.x - pointEvent.x, 2) +
        Math.pow(pointBegin.y - pointEvent.y, 2)
    );
    return length / 100.0;
  }

  resize(point) {
    this.path.segments[1].point.x = this.path.segments[0].point.x;
    this.path.segments[1].point.y = point.y;
    this.path.segments[2].point.x = point.x;
    this.path.segments[2].point.y = point.y;
    this.path.segments[3].point.x = point.x;
    this.path.segments[3].point.y = this.path.segments[0].point.y;
  }
  rotate(event) {
    let data = this.data;
    let unit_x = [1, 0, 0];
    let unit_y = [0, 0, 1];
    let unit_z = [0, 1, 0];
    let xZnak = data.begin.x - event.point.x;
    let yZnak = data.begin.y - event.point.y;
    let sum = xZnak + yZnak;
    let diff = this.getDist(event.point, data.begin);
    diff = sum < 0 ? -diff : diff;
    if (event.modifiers.control) {
      data.tf = a2q(unit_x, diff);
    } else if (event.modifiers.shift) {
      data.tf = a2q(unit_y, diff);
    } else {
      data.tf = a2q(unit_z, diff);
    }
    let tq = mult(data.q, data.tf);
    let x = rot([1, 0, 0], tq);
    let y = rot([0, 1, 0], tq);
    let z = rot([0, 0, 1], tq);
    let draw_x = new paper.Point(
      x[0] * 100 + data.offset_x,
      x[1] * 100 + data.offset_y
    );
    let draw_y = new paper.Point(
      y[0] * 100 + data.offset_x,
      y[1] * 100 + data.offset_y
    );
    let draw_z = new paper.Point(
      z[0] * 100 + data.offset_x,
      z[1] * 100 + data.offset_y
    );
    data.z_axis.removeSegment(1);
    data.z_axis.add(draw_y);

    data.x_axis.removeSegment(1);
    data.x_axis.add(draw_x);

    data.y_axis.removeSegment(1);
    data.y_axis.add(draw_z);
  }
  translate(point) {
    console.log("moving");
  }
}
