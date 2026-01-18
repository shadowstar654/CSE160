
class Sphere {
  constructor() {
    this.color = [1.0, 1.0, 1.0, 1.0];
    this.matrix = new Matrix4();
    this.center = [0, 0, 0];
    this.size = 5.0;
    this.sCount = 10;
  }

  render() {
    const rgba = this.color;
    gl.uniform4f(u_FragColor, rgba[0], rgba[1], rgba[2], rgba[3]);

    // final model matrix = this.matrix * translate(center) * scale(size/5)
    const M = new Matrix4(this.matrix);
    M.translate(this.center[0], this.center[1], this.center[2]);

    const s = this.size / 5.0;
    M.scale(s, s, s);

    gl.uniformMatrix4fv(u_ModelMatrix, false, M.elements);

    const n = Math.max(6, Math.floor(this.sCount));
    const latSteps = n;
    const lonSteps = n * 2;
    const r = 0.5;

    for (let i = 0; i < latSteps; i++) {
      const t0 = (i / latSteps) * Math.PI;
      const t1 = ((i + 1) / latSteps) * Math.PI;

      const st0 = Math.sin(t0), ct0 = Math.cos(t0);
      const st1 = Math.sin(t1), ct1 = Math.cos(t1);

      for (let j = 0; j < lonSteps; j++) {
        const p0 = (j / lonSteps) * 2 * Math.PI;
        const p1 = ((j + 1) / lonSteps) * 2 * Math.PI;

        const sp0 = Math.sin(p0), cp0 = Math.cos(p0);
        const sp1 = Math.sin(p1), cp1 = Math.cos(p1);

        // a = P(t0,p0), b = P(t1,p0), c = P(t1,p1), d = P(t0,p1)
        const ax = r * st0 * cp0, ay = r * ct0, az = r * st0 * sp0;
        const bx = r * st1 * cp0, by = r * ct1, bz = r * st1 * sp0;
        const cx = r * st1 * cp1, cy = r * ct1, cz = r * st1 * sp1;
        const dx = r * st0 * cp1, dy = r * ct0, dz = r * st0 * sp1;

        // (a-b-c)
        drawTriangle3D([ax,ay,az,  bx,by,bz,  cx,cy,cz]);
        // (a-c-d)
        drawTriangle3D([ax,ay,az,  cx,cy,cz,  dx,dy,dz]);
      }
    }
  }
}
