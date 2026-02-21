let g_triPosBuf = null;
let g_triNorBuf = null;

function drawTriangle3D(vertices) {
  // vertices length 9
  if (!gl) return;
  if (typeof a_Position === 'undefined' || a_Position === null || a_Position < 0) return;

  if (!g_triPosBuf) g_triPosBuf = gl.createBuffer();
  if (!g_triNorBuf) g_triNorBuf = gl.createBuffer();
  if (!g_triPosBuf || !g_triNorBuf) return;

  const ax = vertices[0], ay = vertices[1], az = vertices[2];
  const bx = vertices[3], by = vertices[4], bz = vertices[5];
  const cx = vertices[6], cy = vertices[7], cz = vertices[8];

  // flat face normal
  const abx = bx - ax, aby = by - ay, abz = bz - az;
  const acx = cx - ax, acy = cy - ay, acz = cz - az;
  let nx = aby * acz - abz * acy;
  let ny = abz * acx - abx * acz;
  let nz = abx * acy - aby * acx;
  const mag = Math.sqrt(nx*nx + ny*ny + nz*nz) || 1.0;
  nx /= mag; ny /= mag; nz /= mag;

  // positions
  gl.bindBuffer(gl.ARRAY_BUFFER, g_triPosBuf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.DYNAMIC_DRAW);
  gl.vertexAttribPointer(a_Position, 3, gl.FLOAT, false, 0, 0);
  gl.enableVertexAttribArray(a_Position);

  // normals
  if (typeof a_Normal !== 'undefined' && a_Normal !== null && a_Normal >= 0) {
    gl.bindBuffer(gl.ARRAY_BUFFER, g_triNorBuf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
      nx, ny, nz,  nx, ny, nz,  nx, ny, nz
    ]), gl.DYNAMIC_DRAW);
    gl.vertexAttribPointer(a_Normal, 3, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(a_Normal);
  }

  gl.drawArrays(gl.TRIANGLES, 0, 3);
  gl.bindBuffer(gl.ARRAY_BUFFER, null);
}