let g_triBuf = null;
let g_triArr = new Float32Array(9);

function drawTriangle3D(vertices) {
  // vertices must be length 9: [x,y,z, x,y,z, x,y,z]
  if (!g_triBuf) {
    g_triBuf = gl.createBuffer();
    if (!g_triBuf) {
      console.log('Failed to create buffer');
      return;
    }
  }

  // copy into reusable typed array (avoids new Float32Array each call)
  g_triArr[0] = vertices[0]; g_triArr[1] = vertices[1]; g_triArr[2] = vertices[2];
  g_triArr[3] = vertices[3]; g_triArr[4] = vertices[4]; g_triArr[5] = vertices[5];
  g_triArr[6] = vertices[6]; g_triArr[7] = vertices[7]; g_triArr[8] = vertices[8];

  gl.bindBuffer(gl.ARRAY_BUFFER, g_triBuf);
  gl.bufferData(gl.ARRAY_BUFFER, g_triArr, gl.DYNAMIC_DRAW);

  gl.vertexAttribPointer(a_Position, 3, gl.FLOAT, false, 0, 0);
  gl.enableVertexAttribArray(a_Position);

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

    // unit cube centered at origin
    // Front (+Z)
    drawTriangle3D([-0.5,-0.5, 0.5,  0.5,-0.5, 0.5,  0.5, 0.5, 0.5]);
    drawTriangle3D([-0.5,-0.5, 0.5,  0.5, 0.5, 0.5, -0.5, 0.5, 0.5]);

    // Back (-Z)
    drawTriangle3D([-0.5,-0.5,-0.5,  0.5, 0.5,-0.5,  0.5,-0.5,-0.5]);
    drawTriangle3D([-0.5,-0.5,-0.5, -0.5, 0.5,-0.5,  0.5, 0.5,-0.5]);

    // Left (-X)
    drawTriangle3D([-0.5,-0.5,-0.5, -0.5,-0.5, 0.5, -0.5, 0.5, 0.5]);
    drawTriangle3D([-0.5,-0.5,-0.5, -0.5, 0.5, 0.5, -0.5, 0.5,-0.5]);

    // Right (+X)
    drawTriangle3D([ 0.5,-0.5,-0.5,  0.5, 0.5, 0.5,  0.5,-0.5, 0.5]);
    drawTriangle3D([ 0.5,-0.5,-0.5,  0.5, 0.5,-0.5,  0.5, 0.5, 0.5]);

    // Top (+Y)
    drawTriangle3D([-0.5, 0.5,-0.5, -0.5, 0.5, 0.5,  0.5, 0.5, 0.5]);
    drawTriangle3D([-0.5, 0.5,-0.5,  0.5, 0.5, 0.5,  0.5, 0.5,-0.5]);

    // Bottom (-Y)
    drawTriangle3D([-0.5,-0.5,-0.5,  0.5,-0.5, 0.5, -0.5,-0.5, 0.5]);
    drawTriangle3D([-0.5,-0.5,-0.5,  0.5,-0.5,-0.5,  0.5,-0.5, 0.5]);
  }
}