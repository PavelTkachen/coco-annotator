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
    points[5] = this.point3;
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
