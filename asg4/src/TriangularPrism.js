class TriPrism {
  constructor() {
    this.color = [1, 1, 1, 1];
    this.matrix = new Matrix4();
  }

  render() {
    const rgba = this.color;
    gl.uniform4f(u_FragColor, rgba[0], rgba[1], rgba[2], rgba[3]);
    gl.uniformMatrix4fv(u_ModelMatrix, false, this.matrix.elements);
    const A0 = [0.0, 0.0, 0.0];
    const B0 = [1.0, 0.0, 0.0];
    const C0 = [0.5, 1.0, 0.0];

    const A1 = [0.0, 0.0, 1.0];
    const B1 = [1.0, 0.0, 1.0];
    const C1 = [0.5, 1.0, 1.0];

    // Front triangle (z=0)
    drawTriangle3D([
      A0[0], A0[1], A0[2],
      B0[0], B0[1], B0[2],
      C0[0], C0[1], C0[2],
    ]);

    // Back triangle (z=1) - reverse winding so it faces outward
    drawTriangle3D([
      A1[0], A1[1], A1[2],
      C1[0], C1[1], C1[2],
      B1[0], B1[1], B1[2],
    ]);

    // Side 1: A-B rectangle
    drawTriangle3D([
      A0[0], A0[1], A0[2],
      B0[0], B0[1], B0[2],
      B1[0], B1[1], B1[2],
    ]);
    drawTriangle3D([
      A0[0], A0[1], A0[2],
      B1[0], B1[1], B1[2],
      A1[0], A1[1], A1[2],
    ]);

    // Side 2: B-C rectangle
    drawTriangle3D([
      B0[0], B0[1], B0[2],
      C0[0], C0[1], C0[2],
      C1[0], C1[1], C1[2],
    ]);
    drawTriangle3D([
      B0[0], B0[1], B0[2],
      C1[0], C1[1], C1[2],
      B1[0], B1[1], B1[2],
    ]);

    // Side 3: C-A rectangle
    drawTriangle3D([
      C0[0], C0[1], C0[2],
      A0[0], A0[1], A0[2],
      A1[0], A1[1], A1[2],
    ]);
    drawTriangle3D([
      C0[0], C0[1], C0[2],
      A1[0], A1[1], A1[2],
      C1[0], C1[1], C1[2],
    ]);
  }
}
