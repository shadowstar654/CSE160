class Hemisphere {
  constructor() {
    this.color = [1, 1, 1, 1];
    this.matrix = new Matrix4();

    this.size = 5.7;
    this.latBands = 10;
    this.lonBands = 18;

    this._posBuf = null;
    this._norBuf = null;

    this._cacheKey = "";
    this._pos = null;
    this._nor = null;
    this._vertCount = 0;
  }

  _ensureBuffers() {
    if (!this._posBuf) this._posBuf = gl.createBuffer();
    if (!this._norBuf) this._norBuf = gl.createBuffer();
  }

  _rebuildIfNeeded() {
    const latB = Math.max(2, this.latBands | 0);
    const lonB = Math.max(3, this.lonBands | 0);
    const r = this.size / 40.0;

    const key = `${latB}|${lonB}|${r}`;
    if (key === this._cacheKey && this._pos && this._nor) return;
    this._cacheKey = key;

    // each quad -> 2 tris -> 6 verts
    const quadCount = latB * lonB;
    const vertCount = quadCount * 6;

    const pos = new Float32Array(vertCount * 3);
    const nor = new Float32Array(vertCount * 3);

    let p = 0, q = 0;

    function pushV(x, y, z) {
      pos[p++] = x; pos[p++] = y; pos[p++] = z;

      // smooth normal for sphere/hemisphere: normalize position
      const mag = Math.sqrt(x*x + y*y + z*z) || 1.0;
      nor[q++] = x / mag;
      nor[q++] = y / mag;
      nor[q++] = z / mag;
    }

    for (let lat = 0; lat < latB; lat++) {
      const phi0 = (lat / latB) * (Math.PI / 2);
      const phi1 = ((lat + 1) / latB) * (Math.PI / 2);

      const y0 = Math.sin(phi0) * r;
      const y1 = Math.sin(phi1) * r;

      const rr0 = Math.cos(phi0) * r;
      const rr1 = Math.cos(phi1) * r;

      for (let lon = 0; lon < lonB; lon++) {
        const th0 = (lon / lonB) * (Math.PI * 2);
        const th1 = ((lon + 1) / lonB) * (Math.PI * 2);

        const x00 = Math.cos(th0) * rr0;
        const z00 = Math.sin(th0) * rr0;

        const x01 = Math.cos(th1) * rr0;
        const z01 = Math.sin(th1) * rr0;

        const x10 = Math.cos(th0) * rr1;
        const z10 = Math.sin(th0) * rr1;

        const x11 = Math.cos(th1) * rr1;
        const z11 = Math.sin(th1) * rr1;

        // tri 1: (00,10,11)
        pushV(x00, y0, z00);
        pushV(x10, y1, z10);
        pushV(x11, y1, z11);

        // tri 2: (00,11,01)
        pushV(x00, y0, z00);
        pushV(x11, y1, z11);
        pushV(x01, y0, z01);
      }
    }

    this._pos = pos;
    this._nor = nor;
    this._vertCount = vertCount;
  }

  render() {
    this._ensureBuffers();
    this._rebuildIfNeeded();

    gl.uniform4f(u_FragColor, this.color[0], this.color[1], this.color[2], this.color[3]);
    gl.uniformMatrix4fv(u_ModelMatrix, false, this.matrix.elements);

    // positions
    gl.bindBuffer(gl.ARRAY_BUFFER, this._posBuf);
    gl.bufferData(gl.ARRAY_BUFFER, this._pos, gl.STATIC_DRAW);
    gl.vertexAttribPointer(a_Position, 3, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(a_Position);

    // normals
    if (typeof a_Normal !== 'undefined' && a_Normal !== null && a_Normal >= 0) {
      gl.bindBuffer(gl.ARRAY_BUFFER, this._norBuf);
      gl.bufferData(gl.ARRAY_BUFFER, this._nor, gl.STATIC_DRAW);
      gl.vertexAttribPointer(a_Normal, 3, gl.FLOAT, false, 0, 0);
      gl.enableVertexAttribArray(a_Normal);
    }

    gl.drawArrays(gl.TRIANGLES, 0, this._vertCount);
    gl.bindBuffer(gl.ARRAY_BUFFER, null);
  }
}