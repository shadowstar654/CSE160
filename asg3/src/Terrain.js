// Terrain.js (adjustable height + rebuild buffer)

class Terrain {
  constructor(N = 128, size = 40) {
    this.N = N;
    this.size = size;

    // ---- Adjustable params ----
    this.freq = 0.18;      // frequency (bigger = more bumps)
    this.amp  = 0.55;      // amplitude (bigger = taller hills)
    this.ridgeAmp = 0.25;  // ridge strength
    this.baseLift = 0.08;  // lift above FLOOR_Y
    this.uvTile = 12.0;

    this.vboPos = null;
    this.vboUV = null;
    this.ibo = null;
    this.indexCount = 0;

    // cached arrays so we can rebuild quickly
    this._positions = null;
    this._uvs = null;
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


  surfaceYNoRotate(x, z) {
    return FLOOR_Y + this.baseLift + this.heightAt(x, z);
  }

  init(gl) {
    const N = this.N;
    const half = this.size / 2;

    this._positions = new Float32Array((N + 1) * (N + 1) * 3);
    this._uvs       = new Float32Array((N + 1) * (N + 1) * 2);

    const triCount = N * N * 2;
    const idxCount = triCount * 3;
    this._indices  = new Uint16Array(idxCount);

    // build UVs once
    let p = 0, t = 0;
    for (let j = 0; j <= N; j++) {
      const v = j / N;
      const z = -half + v * this.size;

      for (let i = 0; i <= N; i++) {
        const u = i / N;
        const x = -half + u * this.size;

        // placeholder y (will be filled by rebuildHeights)
        this._positions[p++] = x;
        this._positions[p++] = 0;
        this._positions[p++] = z;

        this._uvs[t++] = u * this.uvTile;
        this._uvs[t++] = v * this.uvTile;
      }
    }

    // indices once
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

    // create buffers
    this.vboPos = gl.createBuffer();
    this.vboUV  = gl.createBuffer();
    this.ibo    = gl.createBuffer();

    // upload UV and indices once
    gl.bindBuffer(gl.ARRAY_BUFFER, this.vboUV);
    gl.bufferData(gl.ARRAY_BUFFER, this._uvs, gl.STATIC_DRAW);

    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.ibo);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, this._indices, gl.STATIC_DRAW);

    // build initial heights + upload positions
    this.rebuildHeights(gl);

    // unbind
    gl.bindBuffer(gl.ARRAY_BUFFER, null);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, null);
  }

  // Call this whenever freq/amp/baseLift/etc changes
  rebuildHeights(gl) {
    if (!this._positions || !this.vboPos) return;

    const N = this.N;
    const half = this.size / 2;

    // rewrite ONLY the Y of each vertex
    let p = 0;
    for (let j = 0; j <= N; j++) {
      const v = j / N;
      const z = -half + v * this.size;

      for (let i = 0; i <= N; i++) {
        const u = i / N;
        const x = -half + u * this.size;

        const y = g_terrainBase + this.heightAt(x, z, g_terrainFreq, g_terrainAmp);


        // positions are [x,y,z] triplets
        // x at p, y at p+1, z at p+2
        // (x/z already set, but harmless to re-set)
        this._positions[p]   = x;
        this._positions[p+1] = y;
        this._positions[p+2] = z;

        p += 3;
      }
    }

    gl.bindBuffer(gl.ARRAY_BUFFER, this.vboPos);
    gl.bufferData(gl.ARRAY_BUFFER, this._positions, gl.STATIC_DRAW);
    gl.bindBuffer(gl.ARRAY_BUFFER, null);
  }

  render(gl, worldMat, texture) {
    if (!this.vboPos || !this.vboUV || !this.ibo) return;

    gl.uniformMatrix4fv(u_ModelMatrix, false, worldMat.elements);

    if (texture && u_UseTexture && u_UVScale && u_Sampler && a_UV !== null && a_UV >= 0) {
      gl.uniform1i(u_UseTexture, 1);
      gl.uniform2f(u_UVScale, 1.0, 1.0);
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, texture);
      gl.uniform1i(u_Sampler, 0);
    } else {
      gl.uniform1i(u_UseTexture, 0);
      gl.uniform4f(u_FragColor, 0.35, 0.75, 0.35, 1.0);
    }

    gl.bindBuffer(gl.ARRAY_BUFFER, this.vboPos);
    gl.vertexAttribPointer(a_Position, 3, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(a_Position);

    gl.bindBuffer(gl.ARRAY_BUFFER, this.vboUV);
    gl.vertexAttribPointer(a_UV, 2, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(a_UV);

    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.ibo);
    gl.drawElements(gl.TRIANGLES, this.indexCount, gl.UNSIGNED_SHORT, 0);

    gl.bindTexture(gl.TEXTURE_2D, null);
    gl.uniform1i(u_UseTexture, 0);
    gl.bindBuffer(gl.ARRAY_BUFFER, null);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, null);
  }
}

// helper (keep if you already use it)
function groundYAtWorld(x, z) {
  if (!window.g_terrain) return (typeof FLOOR_Y !== "undefined" ? FLOOR_Y : 0);

  const rad = (-(window.g_globalAngle || 0) * Math.PI) / 180.0;
  const c = Math.cos(rad), s = Math.sin(rad);

  const xr = x * c - z * s;
  const zr = x * s + z * c;

  return window.g_terrain.surfaceYNoRotate(xr, zr);
}
