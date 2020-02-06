import paper from "paper";

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

    var norm = function(vec) {
      return vec.reduce(function(s, e) {
        return s + e * e;
      }, 0);
    };
    var distance = function(vec) {
      return Math.sqrt(norm(vec));
    };

    var normalize = function(vec) {
      var dist = distance(vec);
      // assert(dist !== 0);
      return vec.map(function(e) {
        return e / dist;
      });
    };

    var mult = function(a, b) {
      return [
        a[0] * b[0] - a[1] * b[1] - a[2] * b[2] - a[3] * b[3],
        a[0] * b[1] + a[1] * b[0] + a[2] * b[3] - a[3] * b[2],
        a[0] * b[2] + a[2] * b[0] + a[3] * b[1] - a[1] * b[3],
        a[0] * b[3] + a[3] * b[0] + a[1] * b[2] - a[2] * b[1]
      ];
    };

    var a2q = function(axis, phi) {
      var cos = Math.cos(phi / 2);
      var sin = Math.sin(phi / 2);
      var normal = normalize(axis);
      return [cos, sin * normal[0], sin * normal[1], sin * normal[2]];
    };

    var rot = function(vec, q) {
      var qv0 = -q[1] * vec[0] - q[2] * vec[1] - q[3] * vec[2];
      var qv1 = q[0] * vec[0] + q[2] * vec[2] - q[3] * vec[1];
      var qv2 = q[0] * vec[1] + q[3] * vec[0] - q[1] * vec[2];
      var qv3 = q[0] * vec[2] + q[1] * vec[1] - q[2] * vec[0];
      var r1 = qv0 * -q[1] + qv1 * q[0] + qv2 * -q[3] - qv3 * -q[2];
      var r2 = qv0 * -q[2] + qv2 * q[0] + qv3 * -q[1] - qv1 * -q[3];
      var r3 = qv0 * -q[3] + qv3 * q[0] + qv1 * -q[2] - qv2 * -q[1];
      return [r1, r2, r3];
    };

    var unit = Object.freeze([1, 0, 0, 0]);

    let def = () => a2q([1, 1, 0], 0.2);
    let unit_x = [1, 0, 0];
    let unit_y = [0, 0, 1];
    let unit_z = [0, 1, 0];

    let beginX,
      flag = false;
    let q = def();
    let tf = unit;
    let offset_x = point.x;
    let offset_y = point.y;

    let tq = mult(q, tf);
    let x = rot([1, 0, 0], tq);
    let y = rot([0, 1, 0], tq);
    let z = rot([0, 0, 1], tq);

    let draw_x = [x[0] * 100, x[1] * 100];
    let draw_y = [y[0] * 100, y[1] * 100];
    let draw_z = [z[0] * 100, z[1] * 100];

    // строим ось координат
    var path = new paper.Path(
      [offset_x, offset_y],
      [offset_x - draw_x[0], offset_y - draw_x[1]]
    );
    var path2 = new paper.Path(
      [offset_x, offset_y],
      [offset_x - draw_y[0], offset_y - draw_y[1]]
    );
    var path3 = new paper.Path(
      [offset_x, offset_y],
      [draw_z[0] + offset_x, draw_z[1] + offset_y]
    );
    var path4 = new paper.Path.Circle(new paper.Point(offset_x, offset_y), 10);
    path4.fillColor = "red";
    var path5 = new paper.Path.Circle(new paper.Point(offset_x, offset_y), 150);
    path5.fillColor = "black";
    path5.opacity = 0;
    var group = new paper.Group([path, path2, path3, path4, path5]);
    group.strokeColor = "black";

    //функции обработки событий мыши
    group.onClick = function() {
      q = def();
    };

    group.onMouseDown = function(event) {
      beginX = event.point.x;
      flag = true;
    };

    group.onMouseMove = function(event) {
      //получаем координаты
      if (flag) {
        let currX = event.point.x;
        let x_diff = (currX - beginX) / 100;
        if (event.modifiers.control) {
          tf = a2q(unit_x, x_diff);
        } else if (event.modifiers.shift) {
          tf = a2q(unit_y, x_diff);
        } else {
          tf = a2q(unit_z, x_diff);
        }
      }
    };

    group.onMouseUp = function() {
      q = mult(q, tf);
      tf = unit;

      flag = false;
    };

    group.onMouseOut = function() {
      flag = false;
    };
  }

  addPoint(point) {
    this.point2 = new Point(point);
    this.point1_2 = new Point({ x: this.point1.x, y: this.point2.y });
    this.point2_1 = new Point({ x: this.point2.x, y: this.point1.y });
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
