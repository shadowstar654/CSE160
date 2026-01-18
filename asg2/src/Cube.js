// =========================
// Cube.js (self-contained)
// Includes drawTriangle3D used by both Cube and Cylinder
// =========================

function drawTriangle3D(vertices) {
  const n = 3;
  const vertexBuffer = gl.createBuffer();
  if (!vertexBuffer) {
    console.log('Failed to create buffer');
    return;
  }

  gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.DYNAMIC_DRAW);

  gl.vertexAttribPointer(a_Position, 3, gl.FLOAT, false, 0, 0);
  gl.enableVertexAttribArray(a_Position);

  gl.drawArrays(gl.TRIANGLES, 0, n);
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
