// =========================
// Cylinder.js
// Requires drawTriangle3D() from Cube.js
// Local cylinder runs along +Y from y=0..1, radius 0.5
// =========================

class Cylinder {
  constructor() {
    this.color = [1, 1, 1, 1];
    this.matrix = new Matrix4();
    this.segments = 14; // slightly lower for speed; still looks fine
  }

  render() {
    gl.uniform4f(u_FragColor, this.color[0], this.color[1], this.color[2], this.color[3]);
    gl.uniformMatrix4fv(u_ModelMatrix, false, this.matrix.elements);

    const n = this.segments;
    const r = 0.5;
    const y0 = 0.0;
    const y1 = 1.0;

    for (let i = 0; i < n; i++) {
      const a0 = (i / n) * 2 * Math.PI;
      const a1 = ((i + 1) / n) * 2 * Math.PI;

      const x0 = Math.cos(a0) * r;
      const z0 = Math.sin(a0) * r;
      const x1 = Math.cos(a1) * r;
      const z1 = Math.sin(a1) * r;

      // sides (two triangles)
      drawTriangle3D([x0,y0,z0,  x1,y0,z1,  x1,y1,z1]);
      drawTriangle3D([x0,y0,z0,  x1,y1,z1,  x0,y1,z0]);

      // bottom cap
      drawTriangle3D([0,y0,0,  x1,y0,z1,  x0,y0,z0]);

      // top cap
      drawTriangle3D([0,y1,0,  x0,y1,z0,  x1,y1,z1]);
    }
  }
}
