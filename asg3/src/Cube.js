// Cube.js (FULL) — keeps drawTriangle3D + adds UV-capable cube rendering
// Requires global: gl, a_Position, u_ModelMatrix, u_FragColor
// If using textures, also requires: a_UV, u_UseTexture (int)

let g_triBuf = null;
let g_triArr = new Float32Array(9);

function drawTriangle3D(vertices) {
  // vertices length 9: [x,y,z, x,y,z, x,y,z]
  if (!g_triBuf) {
    g_triBuf = gl.createBuffer();
    if (!g_triBuf) {
      console.log('Failed to create buffer');
      return;
    }
  }

  g_triArr[0] = vertices[0]; g_triArr[1] = vertices[1]; g_triArr[2] = vertices[2];
  g_triArr[3] = vertices[3]; g_triArr[4] = vertices[4]; g_triArr[5] = vertices[5];
  g_triArr[6] = vertices[6]; g_triArr[7] = vertices[7]; g_triArr[8] = vertices[8];

  gl.bindBuffer(gl.ARRAY_BUFFER, g_triBuf);
  gl.bufferData(gl.ARRAY_BUFFER, g_triArr, gl.DYNAMIC_DRAW);

  gl.vertexAttribPointer(a_Position, 3, gl.FLOAT, false, 0, 0);
  gl.enableVertexAttribArray(a_Position);

  gl.drawArrays(gl.TRIANGLES, 0, 3);
}

// --- UV path (for textures) ---
let g_uvBuf = null;
let g_uvArr = new Float32Array(6);

function drawTriangle3DUV(vertices, uvs) {
  // vertices length 9, uvs length 6: [u,v,u,v,u,v]
  if (!g_triBuf) {
    g_triBuf = gl.createBuffer();
    if (!g_triBuf) {
      console.log('Failed to create position buffer');
      return;
    }
  }
  if (!g_uvBuf) {
    g_uvBuf = gl.createBuffer();
    if (!g_uvBuf) {
      console.log('Failed to create uv buffer');
      return;
    }
  }

  // positions
  g_triArr[0] = vertices[0]; g_triArr[1] = vertices[1]; g_triArr[2] = vertices[2];
  g_triArr[3] = vertices[3]; g_triArr[4] = vertices[4]; g_triArr[5] = vertices[5];
  g_triArr[6] = vertices[6]; g_triArr[7] = vertices[7]; g_triArr[8] = vertices[8];

  gl.bindBuffer(gl.ARRAY_BUFFER, g_triBuf);
  gl.bufferData(gl.ARRAY_BUFFER, g_triArr, gl.DYNAMIC_DRAW);
  gl.vertexAttribPointer(a_Position, 3, gl.FLOAT, false, 0, 0);
  gl.enableVertexAttribArray(a_Position);

  // uvs
  g_uvArr[0] = uvs[0]; g_uvArr[1] = uvs[1];
  g_uvArr[2] = uvs[2]; g_uvArr[3] = uvs[3];
  g_uvArr[4] = uvs[4]; g_uvArr[5] = uvs[5];

  if (typeof a_UV !== 'undefined' && a_UV !== null && a_UV >= 0) {
    gl.bindBuffer(gl.ARRAY_BUFFER, g_uvBuf);
    gl.bufferData(gl.ARRAY_BUFFER, g_uvArr, gl.DYNAMIC_DRAW);
    gl.vertexAttribPointer(a_UV, 2, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(a_UV);
  }

  gl.drawArrays(gl.TRIANGLES, 0, 3);
}

class Cube {
  constructor() {
    this.color = [1, 1, 1, 1];
    this.matrix = new Matrix4();
  }

  render() {
    gl.uniform4f(u_FragColor, this.color[0], this.color[1], this.color[2], this.color[3]);
    gl.uniformMatrix4fv(u_ModelMatrix, false, this.matrix.elements);

    // If texture is enabled, use UV version.
    const useTex =
      (typeof u_UseTexture !== 'undefined' && u_UseTexture !== null) ?
        gl.getUniform(gl.program, u_UseTexture) : 0;

    if (useTex === 1 && typeof a_UV !== 'undefined' && a_UV !== null && a_UV >= 0) {
      this._renderTextured();
    } else {
      this._renderSolid();
    }
  }

  _renderSolid() {
    // Front (+Z)
    drawTriangle3D([-0.5,-0.5, 0.5,   0.5,-0.5, 0.5,   0.5, 0.5, 0.5]);
    drawTriangle3D([-0.5,-0.5, 0.5,   0.5, 0.5, 0.5,  -0.5, 0.5, 0.5]);

    // Back (-Z)
    drawTriangle3D([-0.5,-0.5,-0.5,   0.5, 0.5,-0.5,   0.5,-0.5,-0.5]);
    drawTriangle3D([-0.5,-0.5,-0.5,  -0.5, 0.5,-0.5,   0.5, 0.5,-0.5]);

    // Left (-X)
    drawTriangle3D([-0.5,-0.5,-0.5,  -0.5,-0.5, 0.5,  -0.5, 0.5, 0.5]);
    drawTriangle3D([-0.5,-0.5,-0.5,  -0.5, 0.5, 0.5,  -0.5, 0.5,-0.5]);

    // Right (+X)
    drawTriangle3D([ 0.5,-0.5,-0.5,   0.5, 0.5, 0.5,   0.5,-0.5, 0.5]);
    drawTriangle3D([ 0.5,-0.5,-0.5,   0.5, 0.5,-0.5,   0.5, 0.5, 0.5]);

    // Top (+Y)
    drawTriangle3D([-0.5, 0.5,-0.5,  -0.5, 0.5, 0.5,   0.5, 0.5, 0.5]);
    drawTriangle3D([-0.5, 0.5,-0.5,   0.5, 0.5, 0.5,   0.5, 0.5,-0.5]);

    // Bottom (-Y)
    drawTriangle3D([-0.5,-0.5,-0.5,   0.5,-0.5, 0.5,  -0.5,-0.5, 0.5]);
    drawTriangle3D([-0.5,-0.5,-0.5,   0.5,-0.5,-0.5,   0.5,-0.5, 0.5]);
  }

  _renderTextured() {
    // UVs: (0,0) bottom-left, (1,1) top-right
    // Front (+Z)
    drawTriangle3DUV(
      [-0.5,-0.5, 0.5,   0.5,-0.5, 0.5,   0.5, 0.5, 0.5],
      [0,0, 1,0, 1,1]
    );
    drawTriangle3DUV(
      [-0.5,-0.5, 0.5,   0.5, 0.5, 0.5,  -0.5, 0.5, 0.5],
      [0,0, 1,1, 0,1]
    );

    // Back (-Z)
    drawTriangle3DUV(
      [-0.5,-0.5,-0.5,  -0.5, 0.5,-0.5,   0.5, 0.5,-0.5],
      [0,0, 0,1, 1,1]
    );
    drawTriangle3DUV(
      [-0.5,-0.5,-0.5,   0.5, 0.5,-0.5,   0.5,-0.5,-0.5],
      [0,0, 1,1, 1,0]
    );

    // Left (-X)
    drawTriangle3DUV(
      [-0.5,-0.5,-0.5,  -0.5,-0.5, 0.5,  -0.5, 0.5, 0.5],
      [0,0, 1,0, 1,1]
    );
    drawTriangle3DUV(
      [-0.5,-0.5,-0.5,  -0.5, 0.5, 0.5,  -0.5, 0.5,-0.5],
      [0,0, 1,1, 0,1]
    );

    // Right (+X)
    drawTriangle3DUV(
      [ 0.5,-0.5,-0.5,   0.5, 0.5,-0.5,   0.5, 0.5, 0.5],
      [0,0, 0,1, 1,1]
    );
    drawTriangle3DUV(
      [ 0.5,-0.5,-0.5,   0.5, 0.5, 0.5,   0.5,-0.5, 0.5],
      [0,0, 1,1, 1,0]
    );

    // Top (+Y)
    drawTriangle3DUV(
      [-0.5, 0.5,-0.5,  -0.5, 0.5, 0.5,   0.5, 0.5, 0.5],
      [0,0, 0,1, 1,1]
    );
    drawTriangle3DUV(
      [-0.5, 0.5,-0.5,   0.5, 0.5, 0.5,   0.5, 0.5,-0.5],
      [0,0, 1,1, 1,0]
    );

    // Bottom (-Y)
    drawTriangle3DUV(
      [-0.5,-0.5,-0.5,   0.5,-0.5,-0.5,   0.5,-0.5, 0.5],
      [0,0, 1,0, 1,1]
    );
    drawTriangle3DUV(
      [-0.5,-0.5,-0.5,   0.5,-0.5, 0.5,  -0.5,-0.5, 0.5],
      [0,0, 1,1, 0,1]
    );
  }
}
