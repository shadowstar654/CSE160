class Camera {
  constructor() {
    // Slightly lower eye/at so walls feel taller (visual, not wall changes)
    this.eye = new Vector3([0, 0.10, 3.5]);
    this.at  = new Vector3([0, 0.00, 0]);
    this.up  = new Vector3([0, 1, 0]);

    this.viewMat = new Matrix4();
    this.projMat = new Matrix4();

    this.moveStep = 0.18;
    this.panStepDeg = 4;

    // Slightly lower FOV than 60 makes things feel less tiny / more “tall”
    this.setPerspective(50, 1.0, 0.1, 100.0);
    this.updateView();
  }

  setPerspective(fovDeg, aspect, near, far) {
    this.projMat.setPerspective(fovDeg, aspect, near, far);
  }

  updateView() {
    this.viewMat.setLookAt(
      this.eye.elements[0], this.eye.elements[1], this.eye.elements[2],
      this.at.elements[0],  this.at.elements[1],  this.at.elements[2],
      this.up.elements[0],  this.up.elements[1],  this.up.elements[2]
    );
  }

  // --- helpers ---
  _forwardDir() {
    let f = new Vector3(this.at.elements);
    f.sub(this.eye);
    f.normalize();
    return f;
  }

  _rightDir() {
    let f = this._forwardDir();
    let r = Vector3.cross(f, this.up);
    r.normalize();
    return r;
  }

  // --- movement ---
  forward() {
    const f = this._forwardDir();
    f.mul(this.moveStep);
    this.eye.add(f);
    this.at.add(f);
    this.updateView();
  }

  back() {
    const f = this._forwardDir();
    f.mul(this.moveStep);
    this.eye.sub(f);
    this.at.sub(f);
    this.updateView();
  }

  left() {
    const r = this._rightDir();
    r.mul(this.moveStep);
    this.eye.sub(r);
    this.at.sub(r);
    this.updateView();
  }

  right() {
    const r = this._rightDir();
    r.mul(this.moveStep);
    this.eye.add(r);
    this.at.add(r);
    this.updateView();
  }

  // pan around eye
  panLeft(deg = this.panStepDeg) { this._pan(deg); }
  panRight(deg = this.panStepDeg) { this._pan(-deg); }

  // Mouse pan: bigger deg based on dx
  panMouse(dxDeg) { this._pan(dxDeg); }

  _pan(deg) {
    const rad = deg * Math.PI / 180.0;

    const f = this._forwardDir(); // normalized
    const fx = f.elements[0];
    const fz = f.elements[2];

    // rotate forward vector around Y axis
    const nx = fx * Math.cos(rad) - fz * Math.sin(rad);
    const nz = fx * Math.sin(rad) + fz * Math.cos(rad);

    // keep same distance from eye to at
    const dist = this._distanceEyeAt();
    const newF = new Vector3([nx, f.elements[1], nz]);
    newF.normalize();
    newF.mul(dist);

    this.at = new Vector3(this.eye.elements);
    this.at.add(newF);

    this.updateView();
  }

  _distanceEyeAt() {
    let v = new Vector3(this.at.elements);
    v.sub(this.eye);
    return v.magnitude();
  }
}