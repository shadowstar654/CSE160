
let g_sPosBuf = null;
let g_sNorBuf = null;

function ensureSphereBuffers() {
  if (!g_sPosBuf) g_sPosBuf = gl.createBuffer();
  if (!g_sNorBuf) g_sNorBuf = gl.createBuffer();
}

class Sphere {
  constructor() {
    this.color = [1, 1, 1, 1];
    this.matrix = new Matrix4();
    this.size = 5.7;
    this.sCount = 14;
  }

  render() {
    ensureSphereBuffers();

    gl.uniform4f(u_FragColor, this.color[0], this.color[1], this.color[2], this.color[3]);
    gl.uniformMatrix4fv(u_ModelMatrix, false, this.matrix.elements);

    const n = Math.max(6, Math.floor(this.sCount));
    const latSteps = n;
    const lonSteps = n * 2;
    const r = 0.5;

    const positions = [];
    const normals = [];

    function pushVertex(x, y, z) {
      positions.push(x, y, z);
      // For unit sphere centered at origin: normal = position normalized
      const mag = Math.sqrt(x*x + y*y + z*z) || 1;
      normals.push(x/mag, y/mag, z/mag);
    }

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

        const ax = r * st0 * cp0, ay = r * ct0, az = r * st0 * sp0;
        const bx = r * st1 * cp0, by = r * ct1, bz = r * st1 * sp0;
        const cx = r * st1 * cp1, cy = r * ct1, cz = r * st1 * sp1;
        const dx = r * st0 * cp1, dy = r * ct0, dz = r * st0 * sp1;

        // tri1: a b c
        pushVertex(ax, ay, az);
        pushVertex(bx, by, bz);
        pushVertex(cx, cy, cz);

        // tri2: a c d
        pushVertex(ax, ay, az);
        pushVertex(cx, cy, cz);
        pushVertex(dx, dy, dz);
      }
    }

    // apply scaling consistent with your old sphere behavior
    // (You were scaling by size/5.0 inside old Sphere.js)
    // Here we assume caller already scaled matrix; keep sphere as radius=0.5.

    // upload pos
    gl.bindBuffer(gl.ARRAY_BUFFER, g_sPosBuf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(positions), gl.DYNAMIC_DRAW);
    gl.vertexAttribPointer(a_Position, 3, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(a_Position);

    // upload normals
    gl.bindBuffer(gl.ARRAY_BUFFER, g_sNorBuf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(normals), gl.DYNAMIC_DRAW);
    gl.vertexAttribPointer(a_Normal, 3, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(a_Normal);

    gl.drawArrays(gl.TRIANGLES, 0, positions.length / 3);

    gl.bindBuffer(gl.ARRAY_BUFFER, null);
  }
}