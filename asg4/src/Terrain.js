export class Terrain {
  constructor(N = 128, size = 40) {
    this.N = N;
    this.size = size;

    this.freq = 0.18;
    this.amp  = 0.55;
    this.uvTile = 12.0;

    this.vboPos = null;
    this.vboUV = null;
    this.vboN = null;
    this.ibo = null;

    this.indexCount = 0;

    this._positions = null;
    this._uvs = null;
    this._normals = null;
    this._indices = null;
  }

  heightAt(x, z, freq = 0.18, amp = 0.55) {
    const s = freq;
    const a = amp;

    const h1 = Math.sin(x * s) * Math.cos(z * s);
    const h2 = 0.5 * Math.sin(x * s * 2.1 + 1.2) * Math.cos(z * s * 1.7 - 0.7);
    const ridges = 0.25 * Math.sin((x + z) * s * 1.3);
    return (h1 + h2 + ridges) * a;
  }

  init(gl) {
    const N = this.N;
    const half = this.size / 2;

    this._positions = new Float32Array((N + 1) * (N + 1) * 3);
    this._uvs       = new Float32Array((N + 1) * (N + 1) * 2);
    this._normals   = new Float32Array((N + 1) * (N + 1) * 3);

    const triCount = N * N * 2;
    const idxCount = triCount * 3;
    this._indices  = new Uint16Array(idxCount);

    // build XZ + UV (heights will be filled in rebuildHeights)
    let p = 0, t = 0;
    for (let j = 0; j <= N; j++) {
      const v = j / N;
      const z = -half + v * this.size;

      for (let i = 0; i <= N; i++) {
        const u = i / N;
        const x = -half + u * this.size;

        this._positions[p++] = x;
        this._positions[p++] = 0;
        this._positions[p++] = z;

        this._uvs[t++] = u * this.uvTile;
        this._uvs[t++] = v * this.uvTile;
      }
    }

    // indices
    const row = N + 1;
    let k = 0;
    for (let j = 0; j < N; j++) {
      for (let i = 0; i < N; i++) {
        const a = j * row + i;
        const b = a + 1;
        const c = a + row;
        const d = c + 1;

        this._indices[k++] = a; this._indices[k++] = c; this._indices[k++] = b;
        this._indices[k++] = b; this._indices[k++] = c; this._indices[k++] = d;
      }
    }
    this.indexCount = this._indices.length;

    // buffers
    this.vboPos = gl.createBuffer();
    this.vboUV  = gl.createBuffer();
    this.vboN   = gl.createBuffer();
    this.ibo    = gl.createBuffer();

    gl.bindBuffer(gl.ARRAY_BUFFER, this.vboUV);
    gl.bufferData(gl.ARRAY_BUFFER, this._uvs, gl.STATIC_DRAW);

    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.ibo);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, this._indices, gl.STATIC_DRAW);

    this.rebuild(gl);

    gl.bindBuffer(gl.ARRAY_BUFFER, null);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, null);
  }

  rebuild(gl) {
    this.rebuildHeights();
    this.rebuildNormals();

    gl.bindBuffer(gl.ARRAY_BUFFER, this.vboPos);
    gl.bufferData(gl.ARRAY_BUFFER, this._positions, gl.STATIC_DRAW);

    gl.bindBuffer(gl.ARRAY_BUFFER, this.vboN);
    gl.bufferData(gl.ARRAY_BUFFER, this._normals, gl.STATIC_DRAW);

    gl.bindBuffer(gl.ARRAY_BUFFER, null);
  }

  rebuildHeights() {
    const N = this.N;
    const half = this.size / 2;

    // If you keep these globals in asgn4.js, Terrain will use them.
    // Otherwise it uses its own defaults.
    const base = (typeof globalThis.g_terrainBase !== "undefined") ? globalThis.g_terrainBase : 0.0;
    const freq = (typeof globalThis.g_terrainFreq !== "undefined") ? globalThis.g_terrainFreq : this.freq;
    const amp  = (typeof globalThis.g_terrainAmp  !== "undefined") ? globalThis.g_terrainAmp  : this.amp;

    let p = 0;
    for (let j = 0; j <= N; j++) {
      const v = j / N;
      const z = -half + v * this.size;

      for (let i = 0; i <= N; i++) {
        const u = i / N;
        const x = -half + u * this.size;

        const y = base + this.heightAt(x, z, freq, amp);

        this._positions[p]   = x;
        this._positions[p+1] = y;
        this._positions[p+2] = z;
        p += 3;
      }
    }
  }

  // finite difference normal: N = normalize(cross(dPdz, dPdx))
  rebuildNormals() {
    const N = this.N;
    const row = N + 1;

    const pos = this._positions;
    const nor = this._normals;

    function idx(i, j) { return (j * row + i) * 3; }

    for (let j = 0; j <= N; j++) {
      for (let i = 0; i <= N; i++) {
        const i0 = Math.max(0, i - 1), i1 = Math.min(N, i + 1);
        const j0 = Math.max(0, j - 1), j1 = Math.min(N, j + 1);

        const pL = idx(i0, j), pR = idx(i1, j);
        const pD = idx(i, j0), pU = idx(i, j1);

        const dxX = pos[pR]   - pos[pL];
        const dxY = pos[pR+1] - pos[pL+1];
        const dxZ = pos[pR+2] - pos[pL+2];

        const dzX = pos[pU]   - pos[pD];
        const dzY = pos[pU+1] - pos[pD+1];
        const dzZ = pos[pU+2] - pos[pD+2];

        // cross(dz, dx)
        let nx = dzY * dxZ - dzZ * dxY;
        let ny = dzZ * dxX - dzX * dxZ;
        let nz = dzX * dxY - dzY * dxX;

        const mag = Math.sqrt(nx*nx + ny*ny + nz*nz) || 1.0;
        nx /= mag; ny /= mag; nz /= mag;

        const p = idx(i, j);
        nor[p] = nx; nor[p+1] = ny; nor[p+2] = nz;
      }
    }
  }

  // Render with explicit locations (module-safe).
  // loc = { a_Position, a_UV, a_Normal, u_ModelMatrix, u_FragColor, u_UseTexture, u_UVScale, u_Sampler, ... }
  render(gl, worldMat, texture, loc) {
    if (!this.vboPos || !this.vboUV || !this.vboN || !this.ibo) return;
    if (!loc) throw new Error("[Terrain] missing loc object");

    const a_Position = loc.a_Position;
    const a_UV       = loc.a_UV;
    const a_Normal   = loc.a_Normal;

    const u_ModelMatrix = loc.u_ModelMatrix;
    const u_FragColor   = loc.u_FragColor;
    const u_UseTexture  = loc.u_UseTexture;
    const u_UVScale     = loc.u_UVScale;
    const u_Sampler     = loc.u_Sampler;

    if (a_Position == null || a_Position < 0) throw new Error("[Terrain] a_Position missing");
    if (!u_ModelMatrix) throw new Error("[Terrain] u_ModelMatrix missing");

    gl.uniformMatrix4fv(u_ModelMatrix, false, worldMat.elements);

    // Normal matrix helper exists in your asgn4.js; keep using it if present.
    if (typeof globalThis.setNormalMatrixFromModel === "function") {
      globalThis.setNormalMatrixFromModel(worldMat);
    }

    const canTex =
      texture &&
      u_UseTexture && u_UVScale && u_Sampler &&
      a_UV != null && a_UV >= 0;

    if (canTex) {
      gl.uniform1i(u_UseTexture, 1);
      gl.uniform2f(u_UVScale, 1.0, 1.0);
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, texture);
      gl.uniform1i(u_Sampler, 0);
      if (u_FragColor) gl.uniform4f(u_FragColor, 1, 1, 1, 1);
    } else {
      if (u_UseTexture) gl.uniform1i(u_UseTexture, 0);
      if (u_FragColor) gl.uniform4f(u_FragColor, 0.35, 0.75, 0.35, 1.0);
    }

    // positions
    gl.bindBuffer(gl.ARRAY_BUFFER, this.vboPos);
    gl.vertexAttribPointer(a_Position, 3, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(a_Position);

    // uvs
    if (a_UV != null && a_UV >= 0) {
      gl.bindBuffer(gl.ARRAY_BUFFER, this.vboUV);
      gl.vertexAttribPointer(a_UV, 2, gl.FLOAT, false, 0, 0);
      gl.enableVertexAttribArray(a_UV);
    }

    // normals
    if (a_Normal != null && a_Normal >= 0) {
      gl.bindBuffer(gl.ARRAY_BUFFER, this.vboN);
      gl.vertexAttribPointer(a_Normal, 3, gl.FLOAT, false, 0, 0);
      gl.enableVertexAttribArray(a_Normal);
    }

    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.ibo);
    gl.drawElements(gl.TRIANGLES, this.indexCount, gl.UNSIGNED_SHORT, 0);

    gl.bindTexture(gl.TEXTURE_2D, null);
    if (u_UseTexture) gl.uniform1i(u_UseTexture, 0);
    gl.bindBuffer(gl.ARRAY_BUFFER, null);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, null);
  }
}