

function cleanToken(tok) {
  // remove commas and extra whitespace
  return tok.replace(/,/g, "").trim();
}

function parseIndex(idxStr, arrayLen) {
  const i = parseInt(idxStr, 10);
  if (!Number.isFinite(i)) return null;
  if (i > 0) return i - 1;
  if (i < 0) return arrayLen + i;
  return null;
}

export default class Model {
  /**
   * @param {WebGLRenderingContext} gl
   * @param {string} filePath
   * @param {object} [opts]
   * @param {boolean} [opts.autoCenter=true]
   * @param {boolean} [opts.autoScale=true]
   * @param {number}  [opts.targetSize=2.0]
   */
  constructor(gl, filePath, opts = {}) {
    this.gl = gl;
    this.filePath = filePath;

    this.color = [1, 1, 1, 1];
    this.matrix = new Matrix4();

    this.isFullyLoaded = false;

    this.vertexBuffer = gl.createBuffer();
    this.normalBuffer = gl.createBuffer();

    if (!this.vertexBuffer || !this.normalBuffer) {
      console.error("Failed to create buffers for", filePath);
    }

    this._opts = {
      autoCenter: opts.autoCenter ?? true,
      autoScale: opts.autoScale ?? true,
      targetSize: opts.targetSize ?? 2.0,
    };

    // start loading immediately
    this.ready = this._getFileContentAndBuild();
  }

  async _getFileContentAndBuild() {
    const response = await fetch(this.filePath);
    if (!response.ok) {
      throw new Error(
        `Could not load file "${this.filePath}". Check path/name (and GitHub Pages case-sensitivity).`
      );
    }
    const text = await response.text();
    this._parseOBJ(text);
    this._uploadToGPU();
    this.isFullyLoaded = true;
  }

  _parseOBJ(fileContent) {
    const lines = fileContent.split("\n");

    const positions = []; // flat [x,y,z,...]
    const normals = [];   // flat [nx,ny,nz,...]

    // unpacked per-triangle
    const outPos = [];
    const outNor = [];

    // for auto-center/scale
    let minX = +Infinity, minY = +Infinity, minZ = +Infinity;
    let maxX = -Infinity, maxY = -Infinity, maxZ = -Infinity;

    for (let li = 0; li < lines.length; li++) {
      const raw = lines[li].trim();
      if (!raw || raw.startsWith("#")) continue;

      const parts = raw.split(/\s+/);
      const head = parts[0];

      if (head === "v") {
        const x = parseFloat(parts[1]);
        const y = parseFloat(parts[2]);
        const z = parseFloat(parts[3]);
        positions.push(x, y, z);

        if (Number.isFinite(x)) { minX = Math.min(minX, x); maxX = Math.max(maxX, x); }
        if (Number.isFinite(y)) { minY = Math.min(minY, y); maxY = Math.max(maxY, y); }
        if (Number.isFinite(z)) { minZ = Math.min(minZ, z); maxZ = Math.max(maxZ, z); }
      } else if (head === "vn") {
        const nx = parseFloat(parts[1]);
        const ny = parseFloat(parts[2]);
        const nz = parseFloat(parts[3]);
        normals.push(nx, ny, nz);
      } else if (head === "f") {
        const faceTokens = parts.slice(1).map(cleanToken).filter(Boolean);
        if (faceTokens.length < 3) continue;
        const faceVerts = [];
        for (const ft of faceTokens) {
          const split = ft.split("//");
          if (split.length < 2) {
            const p = ft.split("/");
            const vStr = p[0];
            const vnStr = p.length >= 3 ? p[2] : null;
            faceVerts.push({ vStr, vnStr });
          } else {
            faceVerts.push({ vStr: split[0], vnStr: split[1] });
          }
        }
        const vCount = faceVerts.length;
        const triEmit = (a, b, c) => {
          for (const idx of [a, b, c]) {
            const vStr = faceVerts[idx].vStr;
            const vnStr = faceVerts[idx].vnStr;

            const vIndex = parseIndex(vStr, positions.length / 3);
            if (vIndex === null || vIndex < 0) continue;

            const vi = vIndex * 3;
            outPos.push(positions[vi], positions[vi + 1], positions[vi + 2]);

            if (vnStr != null && normals.length > 0) {
              const nIndex = parseIndex(vnStr, normals.length / 3);
              if (nIndex !== null && nIndex >= 0) {
                const ni = nIndex * 3;
                outNor.push(normals[ni], normals[ni + 1], normals[ni + 2]);
              } else {
                outNor.push(0, 1, 0);
              }
            } else {
              outNor.push(0, 1, 0);
            }
          }
        };

        // triangulate as (0, i, i+1)
        for (let i = 1; i + 1 < vCount; i++) {
          triEmit(0, i, i + 1);
        }
      }
    }
    if (outPos.length > 0 && Number.isFinite(minX)) {
      const cx = (minX + maxX) * 0.5;
      const cy = (minY + maxY) * 0.5;
      const cz = (minZ + maxZ) * 0.5;

      let scale = 1.0;
      if (this._opts.autoScale) {
        const dx = maxX - minX, dy = maxY - minY, dz = maxZ - minZ;
        const maxDim = Math.max(dx, dy, dz) || 1.0;
        scale = this._opts.targetSize / maxDim;
      }

      if (this._opts.autoCenter || this._opts.autoScale) {
        for (let i = 0; i < outPos.length; i += 3) {
          if (this._opts.autoCenter) {
            outPos[i]     -= cx;
            outPos[i + 1] -= cy;
            outPos[i + 2] -= cz;
          }
          if (this._opts.autoScale) {
            outPos[i]     *= scale;
            outPos[i + 1] *= scale;
            outPos[i + 2] *= scale;
          }
        }
      }
    }

    // If normals are missing or mismatched, still keep arrays aligned
    if (outNor.length !== outPos.length) {
      outNor.length = 0;
      for (let i = 0; i < outPos.length; i += 3) outNor.push(0, 1, 0);
    }
    for (let i = 0; i < outPos.length; i++) {
      if (!Number.isFinite(outPos[i])) outPos[i] = 0;
    }
    for (let i = 0; i < outNor.length; i++) {
      if (!Number.isFinite(outNor[i])) outNor[i] = (i % 3 === 1) ? 1 : 0;
    }

    this.modelData = {
      vertices: new Float32Array(outPos),
      normals: new Float32Array(outNor),
      count: outPos.length / 3,
    };
  }

  _uploadToGPU() {
    const gl = this.gl;
    if (!this.vertexBuffer || !this.normalBuffer) return;

    gl.bindBuffer(gl.ARRAY_BUFFER, this.vertexBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, this.modelData.vertices, gl.STATIC_DRAW);

    gl.bindBuffer(gl.ARRAY_BUFFER, this.normalBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, this.modelData.normals, gl.STATIC_DRAW);

    gl.bindBuffer(gl.ARRAY_BUFFER, null);
  }
  render(gl, program) {
    if (!this.isFullyLoaded) return;
    if (!program) return;

    const aPos = program.a_Position ?? program;
    const a_Position = program.a_Position;
    const a_Normal = program.a_Normal;
    const u_ModelMatrix = program.u_ModelMatrix;
    const u_NormalMatrix = program.u_NormalMatrix;
    const u_FragColor = program.u_FragColor;

    if (a_Position == null || a_Normal == null || u_ModelMatrix == null || u_NormalMatrix == null) {
      console.warn("[Model] Missing attrib/uniform locations. Did you pass the right program object?");
      return;
    }

    // uniforms FIRST
    gl.uniformMatrix4fv(u_ModelMatrix, false, this.matrix.elements);
    if (u_FragColor) gl.uniform4fv(u_FragColor, this.color);

    // normal matrix MUST be set before draw
    if (!this._normalMatrix) this._normalMatrix = new Matrix4();
    this._normalMatrix.setInverseOf(this.matrix);
    this._normalMatrix.transpose();
    gl.uniformMatrix4fv(u_NormalMatrix, false, this._normalMatrix.elements);

    // vertex attribs
    gl.bindBuffer(gl.ARRAY_BUFFER, this.vertexBuffer);
    gl.vertexAttribPointer(a_Position, 3, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(a_Position);

    gl.bindBuffer(gl.ARRAY_BUFFER, this.normalBuffer);
    gl.vertexAttribPointer(a_Normal, 3, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(a_Normal);

    gl.drawArrays(gl.TRIANGLES, 0, this.modelData.count);

    gl.bindBuffer(gl.ARRAY_BUFFER, null);
  }
}