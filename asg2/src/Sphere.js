// =========================
// Sphere.js (REPLACE YOUR CLASS WITH THIS)
// Requires drawTriangle3D() from Cube.js
// Local unit sphere centered at origin, radius = 0.5
// - this.center moves the sphere
// - this.size scales the sphere (like your other shapes)
// - this.sCount controls detail (>= 6 recommended)
// =========================

class Sphere {
  constructor() {
    this.color = [1.0, 1.0, 1.0, 1.0];
    this.matrix = new Matrix4();
    this.center = [0, 0, 0];  // local translation before matrix
    this.size = 5.0;          // used as an additional scale
    this.sCount = 12;         // detail (lat/long segments)
  }

  render() {
    // Color
    const rgba = this.color;
    gl.uniform4f(u_FragColor, rgba[0], rgba[1], rgba[2], rgba[3]);

    // Build final model matrix = this.matrix * translate(center) * scale(size)
    const M = new Matrix4(this.matrix);
    M.translate(this.center[0], this.center[1], this.center[2]);

    // size behaves similar to your other classes (small numbers ok)
    // Map "size" into a reasonable scale factor:
    // size=5 => scale ~1.0, size=10 => scale ~2.0, etc.
    const s = this.size / 5.0;
    M.scale(s, s, s);

    gl.uniformMatrix4fv(u_ModelMatrix, false, M.elements);

    // Sphere detail
    const n = Math.max(6, Math.floor(this.sCount));
    const latSteps = n;
    const lonSteps = n * 2;

    // Unit sphere radius = 0.5 (matches your cube scale vibe)
    const r = 0.5;

    // Helper to convert spherical coords to xyz
    function P(theta, phi) {
      // theta: [0..PI] (latitude)
      // phi:   [0..2PI] (longitude)
      const x = r * Math.sin(theta) * Math.cos(phi);
      const y = r * Math.cos(theta);
      const z = r * Math.sin(theta) * Math.sin(phi);
      return [x, y, z];
    }

    for (let i = 0; i < latSteps; i++) {
      const t0 = (i / latSteps) * Math.PI;
      const t1 = ((i + 1) / latSteps) * Math.PI;

      for (let j = 0; j < lonSteps; j++) {
        const p0 = (j / lonSteps) * 2 * Math.PI;
        const p1 = ((j + 1) / lonSteps) * 2 * Math.PI;

        const a = P(t0, p0);
        const b = P(t1, p0);
        const c = P(t1, p1);
        const d = P(t0, p1);

        // Two triangles per quad (a-b-c, a-c-d)
        drawTriangle3D([
          a[0], a[1], a[2],
          b[0], b[1], b[2],
          c[0], c[1], c[2]
        ]);

        drawTriangle3D([
          a[0], a[1], a[2],
          c[0], c[1], c[2],
          d[0], d[1], d[2]
        ]);
      }
    }
  }
}
