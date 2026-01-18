class Hemisphere {
  constructor() {
    this.color = [1, 1, 1, 1];
    this.matrix = new Matrix4();

    // Similar knobs to your Sphere
    this.size = 5.7;      // controls radius via size/40 like your Sphere
    this.latBands = 10;   // more = smoother (keep small for speed)
    this.lonBands = 18;
  }

  render() {
    const rgba = this.color;

    gl.uniform4f(u_FragColor, rgba[0], rgba[1], rgba[2], rgba[3]);
    gl.uniformMatrix4fv(u_ModelMatrix, false, this.matrix.elements);

    // match your Sphere scaling style
    const r = this.size / 40.0;

    // Top half only: phi from 0..90 degrees
    for (let lat = 0; lat < this.latBands; lat++) {
      const phi0 = (lat / this.latBands) * (Math.PI / 2);
      const phi1 = ((lat + 1) / this.latBands) * (Math.PI / 2);

      const y0 = Math.sin(phi0) * r;
      const y1 = Math.sin(phi1) * r;

      const rr0 = Math.cos(phi0) * r;
      const rr1 = Math.cos(phi1) * r;

      for (let lon = 0; lon < this.lonBands; lon++) {
        const th0 = (lon / this.lonBands) * (Math.PI * 2);
        const th1 = ((lon + 1) / this.lonBands) * (Math.PI * 2);

        const x00 = Math.cos(th0) * rr0;
        const z00 = Math.sin(th0) * rr0;

        const x01 = Math.cos(th1) * rr0;
        const z01 = Math.sin(th1) * rr0;

        const x10 = Math.cos(th0) * rr1;
        const z10 = Math.sin(th0) * rr1;

        const x11 = Math.cos(th1) * rr1;
        const z11 = Math.sin(th1) * rr1;

        // two triangles per quad
        drawTriangle3D([
          x00, y0, z00,
          x10, y1, z10,
          x11, y1, z11
        ]);

        drawTriangle3D([
          x00, y0, z00,
          x11, y1, z11,
          x01, y0, z01
        ]);
      }
    }

    gl.uniform4f(u_FragColor, rgba[0], rgba[1], rgba[2], rgba[3]);
  }
}
