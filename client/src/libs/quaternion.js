class Point {
  constructor(point) {
    this.x = point.x;
    this.y = point.y;
  }
}

export class QuaternionBBox {
  constructor(point) {
    this.point1 = new Point(point); //one corner point.
    this.point2 = null;
  }
  negate = function(vec) {
    return vec.map(function(e) {
      return -e;
    });
  };
  norm = function(vec) {
    return vec.reduce(function(s, e) {
      return s + e * e;
    }, 0);
  };
  distance = function(vec) {
    return Math.sqrt(this.norm(vec));
  };

  normalize = function(vec) {
    var dist = this.distance(vec);
    // assert(dist !== 0);
    return vec.map(function(e) {
      return e / dist;
    });
  };

  mult = function(a, b) {
    return [
      a[0] * b[0] - a[1] * b[1] - a[2] * b[2] - a[3] * b[3],
      a[0] * b[1] + a[1] * b[0] + a[2] * b[3] - a[3] * b[2],
      a[0] * b[2] + a[2] * b[0] + a[3] * b[1] - a[1] * b[3],
      a[0] * b[3] + a[3] * b[0] + a[1] * b[2] - a[2] * b[1]
    ];
  };

  a2q = function(axis, phi) {
    var cos = Math.cos(phi / 2);
    var sin = Math.sin(phi / 2);
    var normal = this.normalize(axis);
    return [cos, sin * normal[0], sin * normal[1], sin * normal[2]];
  };

  rot = function(vec, q) {
    var qv0 = -q[1] * vec[0] - q[2] * vec[1] - q[3] * vec[2];
    var qv1 = q[0] * vec[0] + q[2] * vec[2] - q[3] * vec[1];
    var qv2 = q[0] * vec[1] + q[3] * vec[0] - q[1] * vec[2];
    var qv3 = q[0] * vec[2] + q[1] * vec[1] - q[2] * vec[0];
    var r1 = qv0 * -q[1] + qv1 * q[0] + qv2 * -q[3] - qv3 * -q[2];
    var r2 = qv0 * -q[2] + qv2 * q[0] + qv3 * -q[1] - qv1 * -q[3];
    var r3 = qv0 * -q[3] + qv3 * q[0] + qv1 * -q[2] - qv2 * -q[1];
    return [r1, r2, r3];
  };

  unit = Object.freeze([1, 0, 0, 0]);

  drawLine = (ctx, bx, by, ex, ey, color) => {
    ctx.lineWidth = 2;
    ctx.strokeStyle = color;

    ctx.beginPath();
    ctx.lineCap = "square";
    ctx.moveTo(bx, by);
    ctx.lineTo(ex, ey);
    ctx.stroke();
    ctx.closePath();
  };

  init(point) {
    let def = () => this.a2q([1, 1, 0], 0.2);
    let unit_x = [1, 0, 0];
    let unit_y = [0, 0, 1];
    let unit_z = [0, 1, 0];

    let beginX;
    let beginY;
    let flag = false;
    let q = def();
    let tf = this.unit;

    let canvas = document.getElementById("editor");
    let ctx = canvas.getContext("2d");
    let w = canvas.width;
    let h = canvas.height;

    canvas.addEventListener(
      "mousemove",
      e => {
        if (flag) {
          let currX = e.clientX - canvas.offsetLeft;

          let x_diff = (currX - beginX) / 100;

          if (e.ctrlKey) {
            tf = this.a2q(unit_x, x_diff);
          } else if (e.shiftKey) {
            tf = this.a2q(unit_y, x_diff);
          } else {
            tf = this.a2q(unit_z, x_diff);
          }
        }
      },
      false
    );

    canvas.addEventListener(
      "mousedown",
      e => {
        beginX = e.clientX - canvas.offsetLeft;
        beginY = e.clientY - canvas.offsetTop;
        flag = true;
      },
      false
    );

    canvas.addEventListener(
      "mouseup",
      () => {
        tf = this.unit;
        q = this.mult(q, tf);
        flag = false;
      },
      false
    );

    canvas.addEventListener(
      "mouseout",
      () => {
        flag = false;
      },
      false
    );

    const draw = () => {
        
      let offsetX = point.x;
      let offsetY = point.y;
      let tq = this.mult(q, tf);
      let x = this.rot([1, 0, 0], tq);
      let y = this.rot([0, 1, 0], tq);
      let z = this.rot([0, 0, 1], tq);

      let draw_x = [x[0] * 100, x[1] * 100];
      let draw_y = [y[0] * 100, y[1] * 100];
      let draw_z = [z[0] * 100, z[1] * 100];

      //ctx.clearRect(0, 0, w, h);
      //ctx.drawImage(image, 0, 0);

      this.drawLine(ctx, offsetX, offsetY, offsetX - draw_x[0], offsetY - draw_x[1], "green");
      this.drawLine(ctx, offsetX, offsetY, offsetX - draw_y[0], offsetY - draw_y[1], "red");
      this.drawLine(ctx, offsetX, offsetY, draw_z[0] + offsetX, draw_z[1] + offsetY, "blue");

      window.requestAnimationFrame(draw);
    };
    draw();
  }

  addPoint(point) {
    this.point2 = new Point(point);
    this.point1_2 = new Point({ x: this.point1.x, y: this.point2.y });
    this.point2_1 = new Point({ x: this.point2.x, y: this.point1.y });
    this.point3 = new Point({
      x: (this.point2.x + this.point1.x) / 2,
      y: (this.point2.y + this.point1.y) / 2
    });
  }

  modifyPoint(point) {
    this.point2 = null;
    this.addPoint(point);
  }
  getPoints(e) {
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
