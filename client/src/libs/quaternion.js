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
    points[0] = this.point2;
    return points;
  }

  removePoint() {
    this.point2 = null;
  }

  isComplete() {
    return !!this.point2;
  }
}
