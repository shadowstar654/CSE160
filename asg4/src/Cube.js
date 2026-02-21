// ======================= Cube.js (LIT + UV + NORMALS) =======================
// ES-module friendly. Can fall back to globalThis.gl if gl isn't passed.

let g_posBuf = null;
let g_uvBuf  = null;
let g_nBuf   = null;
let g_uploaded = false;

function getGL(gl) {
  // Allow either explicit gl or global fallback
  return gl || globalThis.gl || window.gl;
}

function ensureCubeBuffers(gl) {
  gl = getGL(gl);
  if (!gl) throw new Error("[Cube] gl is undefined. Pass gl into render(), or set globalThis.gl after getContext().");

  if (!g_posBuf) g_posBuf = gl.createBuffer();
  if (!g_uvBuf)  g_uvBuf  = gl.createBuffer();
  if (!g_nBuf)   g_nBuf   = gl.createBuffer();

  // Upload static data ONCE (major performance + avoids accidental issues)
  if (!g_uploaded) {
    gl.bindBuffer(gl.ARRAY_BUFFER, g_posBuf);
    gl.bufferData(gl.ARRAY_BUFFER, CUBE_POS, gl.STATIC_DRAW);

    gl.bindBuffer(gl.ARRAY_BUFFER, g_uvBuf);
    gl.bufferData(gl.ARRAY_BUFFER, CUBE_UV, gl.STATIC_DRAW);

    gl.bindBuffer(gl.ARRAY_BUFFER, g_nBuf);
    gl.bufferData(gl.ARRAY_BUFFER, CUBE_N, gl.STATIC_DRAW);

    gl.bindBuffer(gl.ARRAY_BUFFER, null);
    g_uploaded = true;
  }

  return gl;
}

// 36 vertices (6 faces * 2 tris * 3 verts)
const CUBE_POS = new Float32Array([
  // +Z
  -0.5,-0.5, 0.5,   0.5,-0.5, 0.5,   0.5, 0.5, 0.5,
  -0.5,-0.5, 0.5,   0.5, 0.5, 0.5,  -0.5, 0.5, 0.5,
  // -Z
  -0.5,-0.5,-0.5,  -0.5, 0.5,-0.5,   0.5, 0.5,-0.5,
  -0.5,-0.5,-0.5,   0.5, 0.5,-0.5,   0.5,-0.5,-0.5,
  // -X
  -0.5,-0.5,-0.5,  -0.5,-0.5, 0.5,  -0.5, 0.5, 0.5,
  -0.5,-0.5,-0.5,  -0.5, 0.5, 0.5,  -0.5, 0.5,-0.5,
  // +X
   0.5,-0.5,-0.5,   0.5, 0.5,-0.5,   0.5, 0.5, 0.5,
   0.5,-0.5,-0.5,   0.5, 0.5, 0.5,   0.5,-0.5, 0.5,
  // +Y
  -0.5, 0.5,-0.5,  -0.5, 0.5, 0.5,   0.5, 0.5, 0.5,
  -0.5, 0.5,-0.5,   0.5, 0.5, 0.5,   0.5, 0.5,-0.5,
  // -Y
  -0.5,-0.5,-0.5,   0.5,-0.5,-0.5,   0.5,-0.5, 0.5,
  -0.5,-0.5,-0.5,   0.5,-0.5, 0.5,  -0.5,-0.5, 0.5,
]);

const CUBE_UV = new Float32Array([
  // +Z
  0,0, 1,0, 1,1,  0,0, 1,1, 0,1,
  // -Z
  0,0, 0,1, 1,1,  0,0, 1,1, 1,0,
  // -X
  0,0, 1,0, 1,1,  0,0, 1,1, 0,1,
  // +X
  0,0, 0,1, 1,1,  0,0, 1,1, 1,0,
  // +Y
  0,0, 0,1, 1,1,  0,0, 1,1, 1,0,
  // -Y
  0,0, 1,0, 1,1,  0,0, 1,1, 0,1,
]);

const CUBE_N = new Float32Array([
  // +Z
  0,0,1, 0,0,1, 0,0,1,  0,0,1, 0,0,1, 0,0,1,
  // -Z
  0,0,-1, 0,0,-1, 0,0,-1,  0,0,-1, 0,0,-1, 0,0,-1,
  // -X
  -1,0,0, -1,0,0, -1,0,0,  -1,0,0, -1,0,0, -1,0,0,
  // +X
  1,0,0, 1,0,0, 1,0,0,  1,0,0, 1,0,0, 1,0,0,
  // +Y
  0,1,0, 0,1,0, 0,1,0,  0,1,0, 0,1,0, 0,1,0,
  // -Y
  0,-1,0, 0,-1,0, 0,-1,0,  0,-1,0, 0,-1,0, 0,-1,0,
]);

export class Cube {
  constructor() {
    this.color = [1, 1, 1, 1];
    this.matrix = new Matrix4();
  }

  render(gl, loc) {
    gl = ensureCubeBuffers(gl);

    if (!loc) throw new Error("[Cube] loc object missing");

    const { a_Position, a_UV, a_Normal, u_ModelMatrix, u_FragColor } = loc;

    if (a_Position == null || a_Position < 0) throw new Error("[Cube] a_Position missing");
    if (!u_ModelMatrix) throw new Error("[Cube] u_ModelMatrix missing");
    if (!u_FragColor) {
      console.warn("[Cube] u_FragColor missing — defaulting to white");
    }

    if (u_FragColor) {
      gl.uniform4f(u_FragColor, this.color[0], this.color[1], this.color[2], this.color[3]);
    }
    gl.uniformMatrix4fv(u_ModelMatrix, false, this.matrix.elements);

    // positions
    gl.bindBuffer(gl.ARRAY_BUFFER, g_posBuf);
    gl.vertexAttribPointer(a_Position, 3, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(a_Position);

    // uvs
    if (a_UV != null && a_UV >= 0) {
      gl.bindBuffer(gl.ARRAY_BUFFER, g_uvBuf);
      gl.vertexAttribPointer(a_UV, 2, gl.FLOAT, false, 0, 0);
      gl.enableVertexAttribArray(a_UV);
    }

    // normals
    if (a_Normal != null && a_Normal >= 0) {
      gl.bindBuffer(gl.ARRAY_BUFFER, g_nBuf);
      gl.vertexAttribPointer(a_Normal, 3, gl.FLOAT, false, 0, 0);
      gl.enableVertexAttribArray(a_Normal);
    }

    gl.drawArrays(gl.TRIANGLES, 0, 36);
    gl.bindBuffer(gl.ARRAY_BUFFER, null);
  }
}