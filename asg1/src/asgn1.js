// ColoredPoint.js (c) 2012 matsuda
// Vertex shader program
var VSHADER_SOURCE = `
   attribute vec4 a_Position;
   uniform float u_Size;
   void main() { 
    gl_Position = a_Position;
    gl_PointSize = u_Size;
  }`

// Fragment shader program
var FSHADER_SOURCE = `
  precision mediump float;
  uniform vec4 u_FragColor;
  void main() {
    gl_FragColor = u_FragColor;
  }` 

// Global Variables
let canvas;
let gl;
let a_Position;
let u_FragColor;
let u_Size;

function setupWebGL(){
    // Retrieve <canvas> element
    canvas = document.getElementById('webgl');
    // Get the rendering context for WebGL
    //gl = getWebGLContext(canvas);
    gl = canvas.getContext("webgl", {preserveDrawingBuffer: true});
    if (!gl) {
        console.log('Failed to get the rendering context for WebGL');
        return;
    }
}

function connectVariablesToGLSL(){
    if (!initShaders(gl, VSHADER_SOURCE, FSHADER_SOURCE)) {
        console.log('Failed to intialize shaders.');
        return;
    }
    // Get the storage location of a_Position
    a_Position = gl.getAttribLocation(gl.program, 'a_Position');
    if (a_Position < 0) {
        console.log('Failed to get the storage location of a_Position');
        return;
    }
    // Get the storage location of u_FragColor
    u_FragColor = gl.getUniformLocation(gl.program, 'u_FragColor');
    if (!u_FragColor) {
        console.log('Failed to get the storage location of u_FragColor');
        return;
    }
    // Get the storage location of u_Size
    u_Size = gl.getUniformLocation(gl.program, 'u_Size');
    if (!u_Size) {
        console.log('Failed to get the storage location of u_Size');
        return;
    }
}
function createStarAt(x, y, size) {
    const star = new Star();
    const outerR = size / 200;
    const innerR = outerR * 0.45;

    star.color = g_selectedColor.slice();
    star.vertices = [];

    const points = [];
    for (let i = 0; i < 10; i++) {
        const angle = Math.PI / 2 + i * Math.PI / 5;
        const r = (i % 2 === 0) ? outerR : innerR;
        points.push([
            x + r * Math.cos(angle),
            y + r * Math.sin(angle)
        ]);
    }

    // Triangle fan from center
    for (let i = 0; i < 10; i++) {
        const p1 = points[i];
        const p2 = points[(i + 1) % 10];

        star.vertices.push(
            x, y,
            p1[0], p1[1],
            p2[0], p2[1]
        );
    }

    g_shapesList.push(star);
}
function createHeartAt(x, y, size) {
    const heart = new Heart();
    const r = size / 200;

    heart.color = g_selectedColor.slice();
    heart.vertices = [];

    const left = [x - r * 0.5, y + r * 0.3];
    const right = [x + r * 0.5, y + r * 0.3];
    const bottom = [x, y - r * 0.7];

    // Left lobe
    heart.vertices.push(
        x, y,
        left[0], left[1],
        x - r * 0.8, y
    );

    // Right lobe
    heart.vertices.push(
        x, y,
        right[0], right[1],
        x + r * 0.8, y
    );

    // Bottom triangle
    heart.vertices.push(
        x, y,
        x - r * 0.6, y,
        bottom[0], bottom[1]
    );

    heart.vertices.push(
        x, y,
        x + r * 0.6, y,
        bottom[0], bottom[1]
    );

    g_shapesList.push(heart);
}

// Constants
const POINT = 0;
const TRIANGLE = 1;
const CIRCLE = 2;
const STAR = 3;
const HEART = 4;

// Globals related UI elements
let g_selectedColor = [1.0, 1.0, 1.0, 1.0];
let g_selectedSize = 5;
let g_selectedType = POINT;
let g_selectedSegments = 10;

// Set up actions for the HTML UI elements
function addActionsForHtmlUI(){
    //Button Events (Shape Type)
    // document.getElementById('green').onclick = function() { g_selectedColor = [0.0, 1.0, 0.0, 1.0]; };
    // document.getElementById('red').onclick = function() { g_selectedColor = [1.0, 0.0, 0.0, 1.0]; };
    document.getElementById('red').onclick = function() {
        g_selectedColor = [1.0, 0.0, 0.0, 1.0];
        document.getElementById('redSlide').value = 100;
        document.getElementById('greenSlide').value = 0;
        document.getElementById('blueSlide').value = 0;
    };
    document.getElementById('green').onclick = function() {
        g_selectedColor = [0.0, 1.0, 0.0, 1.0];
        document.getElementById('redSlide').value = 0;
        document.getElementById('greenSlide').value = 100;
        document.getElementById('blueSlide').value = 0;
    };
    document.getElementById('clearButton').onclick = function() {
        g_shapesList = [];
        renderAllShapes();
    };
    document.getElementById('pointButton').onclick = function() { g_selectedType = POINT };
    document.getElementById('triButton').onclick = function() { g_selectedType = TRIANGLE };
    document.getElementById('circleButton').onclick = function() { g_selectedType = CIRCLE };
    document.getElementById('starButton').onclick = function() { g_selectedType = STAR };
    document.getElementById('heartButton').onclick = function() { g_selectedType = HEART };

    //Slider Events
    // document.getElementById('redSlide').addEventListener('mouseup',   function() { g_selectedColor[0] = this.value/100; });
    // document.getElementById('greenSlide').addEventListener('mouseup',   function() { g_selectedColor[1] = this.value/100; });
    // document.getElementById('blueSlide').addEventListener('mouseup',   function() { g_selectedColor[2] = this.value/100; });
    // Panda button
    document.getElementById('pandaButton').onclick = function() {
        drawPanda();
    };
    document.getElementById('redSlide').addEventListener('input', function() {
        g_selectedColor[0] = this.value / 100;
    });
    document.getElementById('greenSlide').addEventListener('input', function() {
        g_selectedColor[1] = this.value / 100;
    });

    document.getElementById('blueSlide').addEventListener('input', function() {
        g_selectedColor[2] = this.value / 100;
    });

    document.getElementById('sizeSlide').addEventListener('input', function() {
        g_selectedSize = this.value;
    });

    document.getElementById('segmentSlide').addEventListener('input', function() {
        g_selectedSegments = this.value;
    });
}

function main() {
  // Set up canvas and gl variables
  setupWebGL();
  // Set up GLSL shader programs and connect GLSL variables
  connectVariablesToGLSL();
  //Set up actions for the HTML UI elements
  addActionsForHtmlUI();
  // Register function (event handler) to be called on a mouse press
  canvas.onmousedown = click;
  canvas.onmousemove = function(ev) { if(ev.buttons == 1){ click(ev) }};
  // Specify the color for clearing <canvas>
  gl.clearColor(0.0, 0.0, 0.0, 1.0);
  // Clear <canvas>
  gl.clear(gl.COLOR_BUFFER_BIT);
  document.getElementById('redSlide').value   = g_selectedColor[0] * 100;
  document.getElementById('greenSlide').value = g_selectedColor[1] * 100;
  document.getElementById('blueSlide').value  = g_selectedColor[2] * 100;
}

var g_shapesList = [];
// var g_points = [];  // The array for the position of a mouse press
// var g_colors = [];  // The array to store the color of a point
// var g_sizes =  []; // The array to store the size of a point
function click(ev) {
    let [x, y] = convertCoordinatesEventTOGL(ev);

    if (g_selectedType === STAR) {
        createStarAt(x, y, g_selectedSize);
        renderAllShapes();
        return;
    }

    if (g_selectedType === HEART) {
        createHeartAt(x, y, g_selectedSize);
        renderAllShapes();
        return;
    }

    let point;
    if (g_selectedType === POINT) {
        point = new Point();
    } else if (g_selectedType === TRIANGLE) {
        point = new Triangle();
    } else if (g_selectedType === CIRCLE) {
        point = new Circle();
        point.segments = g_selectedSegments;
    }

    point.position = [x, y];
    point.color = g_selectedColor.slice();
    point.size = g_selectedSize;

    g_shapesList.push(point);
    renderAllShapes();
}

function convertCoordinatesEventTOGL(ev){
    var x = ev.clientX; // x coordinate of a mouse pointer
    var y = ev.clientY; // y coordinate of a mouse pointer
    var rect = ev.target.getBoundingClientRect();
    x = ((x - rect.left) - canvas.width/2)/(canvas.width/2);
    y = (canvas.height/2 - (y - rect.top))/(canvas.height/2);

    return [x, y];
}

function renderAllShapes(){
    var startTime = performance.now();
    gl.clear(gl.COLOR_BUFFER_BIT);
    var len = g_shapesList.length;
    for(var i = 0; i < len; i++) {
        g_shapesList[i].render();
        // var xy = g_shapesList[i].position;
        // var rgba = g_shapesList[i].color;
        // var size = g_shapesList[i].size;
        // // var xy = g_points[i];
        // // var rgba = g_colors[i];
        // // var size = g_sizes[i];
        // // Pass the position of a point to a_Position variable
        // gl.vertexAttrib3f(a_Position, xy[0], xy[1], 0.0);
        // // Pass the color of a point to u_FragColor variable
        // gl.uniform4f(u_FragColor, rgba[0], rgba[1], rgba[2], rgba[3]);
        // //Pass the color of a point to u_Size variable
        // gl.uniform1f(u_Size, size);
        // // Draw
        // gl.drawArrays(gl.POINTS, 0, 1);
    }
    var duration = performance.now() - startTime;
    sendTextToHTML(
        "numdot: " + len + 
        " | ms: " + Math.floor(duration) + 
        " | fps: " + Math.floor(10000 / duration),
        "numdot"
    );
}

//My Panda
function drawPanda() {
    let tri;
    //Head
    tri = new Triangle(); tri.vertices = [-0.38,0.48, 0.38,0.48, 0.0,0.1]; tri.color=[1,1,1,1]; g_shapesList.push(tri);
    tri = new Triangle(); tri.vertices = [-0.38,0.48, 0.0,0.1, -0.38,-0.1]; tri.color=[1,1,1,1]; g_shapesList.push(tri);
    tri = new Triangle(); tri.vertices = [0.38,0.48, 0.0,0.1, 0.38,-0.1]; tri.color=[1,1,1,1]; g_shapesList.push(tri);
    tri = new Triangle(); tri.vertices = [-0.28,-0.1, 0.28,-0.1, 0,-0.28]; tri.color=[1,1,1,1]; g_shapesList.push(tri);
    // Cheeks
    tri = new Triangle(); tri.vertices = [-0.25,0.05, -0.05,0.05, -0.15,-0.05]; tri.color=[1,1,1,1]; g_shapesList.push(tri);
    tri = new Triangle(); tri.vertices = [0.25,0.05, 0.05,0.05, 0.15,-0.05]; tri.color=[1,1,1,1]; g_shapesList.push(tri);
    // Ears
    tri = new Triangle(); tri.vertices = [-0.52,0.57, -0.37,0.57, -0.445,0.42]; tri.color=[0,0,0,1]; g_shapesList.push(tri);
    tri = new Triangle(); tri.vertices = [0.52,0.57, 0.37,0.57, 0.445,0.42]; tri.color=[0,0,0,1]; g_shapesList.push(tri);
    tri = new Triangle(); tri.vertices = [-0.48,0.53, -0.42,0.53, -0.45,0.5]; tri.color=[1,1,1,1]; g_shapesList.push(tri);
    tri = new Triangle(); tri.vertices = [0.48,0.53, 0.42,0.53, 0.45,0.5]; tri.color=[1,1,1,1]; g_shapesList.push(tri);
    // Inner Ears (pink)
    const earPink = [1.0, 0.7, 0.8, 1.0];

    tri = new Triangle(); tri.vertices = [-0.47,0.55, -0.42,0.55, -0.445,0.49]; tri.color=earPink.slice(); g_shapesList.push(tri);
    tri = new Triangle(); tri.vertices = [0.47,0.55, 0.42,0.55, 0.445,0.49]; tri.color=earPink.slice(); g_shapesList.push(tri);

    // Eye patch
    tri = new Triangle(); tri.vertices = [-0.22,0.27, -0.08,0.27, -0.145,0.12]; tri.color=[0,0,0,1]; g_shapesList.push(tri);
    tri = new Triangle(); tri.vertices = [-0.22,0.17, -0.08,0.17, -0.145,0.12]; tri.color=[0,0,0,1]; g_shapesList.push(tri);
    tri = new Triangle(); tri.vertices = [0.22,0.27, 0.08,0.27, 0.145,0.12]; tri.color=[0,0,0,1]; g_shapesList.push(tri);
    tri = new Triangle(); tri.vertices = [0.22,0.17, 0.08,0.17, 0.145,0.12]; tri.color=[0,0,0,1]; g_shapesList.push(tri);
    // Eye
    tri = new Triangle(); tri.vertices = [-0.14,0.21, -0.11,0.21, -0.125,0.155]; tri.color=[1,1,1,1]; g_shapesList.push(tri);
    tri = new Triangle(); tri.vertices = [0.14,0.21, 0.11,0.21, 0.125,0.155]; tri.color=[1,1,1,1]; g_shapesList.push(tri);
    // Nose
    tri = new Triangle(); tri.vertices = [-0.05,-0.05, 0.05,-0.05, 0,-0.15]; tri.color=[0,0,0,1]; g_shapesList.push(tri);
    // Body
    tri = new Triangle(); tri.vertices = [-0.35,-0.2, 0.35,-0.2, 0,-0.8]; tri.color=[1,1,1,1]; g_shapesList.push(tri);
    // Arms
    const armWhite = [1,1,1,1];
    tri = new Triangle();
    tri.vertices = [-0.55,-0.1, -0.45,-0.1, -0.5,-0.4];
    tri.color = armWhite.slice();
    g_shapesList.push(tri);
    tri = new Triangle();
    tri.vertices = [0.55,-0.1, 0.45,-0.1, 0.5,-0.4];
    tri.color = armWhite.slice();
    g_shapesList.push(tri);
    // Legs
    tri = new Triangle(); tri.vertices = [-0.2,-0.8, -0.05,-0.8, -0.125,-0.65]; tri.color=[0,0,0,1]; g_shapesList.push(tri);
    tri = new Triangle(); tri.vertices = [0.2,-0.8, 0.05,-0.8, 0.125,-0.65]; tri.color=[0,0,0,1]; g_shapesList.push(tri);
    //Feet
    const footWhite = [1,1,1,1];
    tri = new Triangle(); tri.vertices = [-0.25,-0.82, -0.05,-0.82, -0.15,-0.9]; tri.color=footWhite.slice(); g_shapesList.push(tri);
    tri = new Triangle(); tri.vertices = [0.25,-0.82, 0.05,-0.82, 0.15,-0.9]; tri.color=footWhite.slice(); g_shapesList.push(tri);
    // Bamboo
    const bambooColor = [0,0.6,0,1];
    // Stalk
    tri = new Triangle(); tri.vertices = [0.6,-0.8, 0.62,-0.8, 0.61,0.2]; tri.color=bambooColor; g_shapesList.push(tri);
    tri = new Triangle(); tri.vertices = [0.6,-0.6, 0.62,-0.6, 0.61,0.4]; tri.color=bambooColor; g_shapesList.push(tri);
    tri = new Triangle(); tri.vertices = [0.6,-0.4, 0.62,-0.4, 0.61,0.6]; tri.color=bambooColor; g_shapesList.push(tri);
    // Leaves
    tri = new Triangle(); tri.vertices = [0.61,0.6, 0.61,0.7, 0.65,0.65]; tri.color=bambooColor; g_shapesList.push(tri);
    tri = new Triangle(); tri.vertices = [0.61,0.7, 0.61,0.8, 0.64,0.75]; tri.color=bambooColor; g_shapesList.push(tri);
    tri = new Triangle(); tri.vertices = [0.61,0.55, 0.61,0.65, 0.57,0.6]; tri.color=bambooColor; g_shapesList.push(tri);
    tri = new Triangle(); tri.vertices = [0.61,0.65, 0.61,0.75, 0.58,0.7]; tri.color=bambooColor; g_shapesList.push(tri);
    drawWatermarkAY();
    renderAllShapes();
}
function drawWatermarkAY() {
    const color = [0.2, 0.4, 1.0, 1.0];
    const holeColor = [0, 0, 0, 1];
    let tri;
    const baseX = 0.65;
    const baseY = -0.9;
    const spacing = 0.015;
    const triSize = 10;
    //My A
    const Apattern = [
        // Peak top
        [2,5],
        [1,4],[2,4],[3,4],
        // Left leg
        [0,0],[0,1],[0,2],[0,3],
        [1,1],[1,2],[1,3],
        // Right leg
        [4,0],[4,1],[4,2],[4,3],
        [3,1],[3,2],[3,3],
        // Cross
        [1,2],[2,2],[3,2]
    ];
    Apattern.forEach(([dx, dy]) => {
        tri = new Triangle();
        tri.position = [baseX + dx * spacing, baseY + dy * spacing];
        tri.color = color.slice();
        tri.size = triSize;
        g_shapesList.push(tri);
    });
    // Need a hole through A, so it doesn't look like M
    tri = new Triangle();
    tri.position = [baseX + 2 * spacing, baseY + 3 * spacing];
    tri.color = holeColor.slice();
    tri.size = triSize * 0.8;
    g_shapesList.push(tri);
    drawWatermarkY();
}
function drawWatermarkY() {
    const triSize = 0.015;
    const spacing = 0.03;
    const blue = [0.2, 0.4, 1.0, 1.0];
    const black = [0, 0, 0, 1];
    let tri;
    const YbaseX = 0.78;
    const YbaseY = -0.8;
    // Left branch of Y
    for (let i = 0; i < 3; i++) {
        tri = new Triangle();
        tri.vertices = [
            YbaseX, YbaseY + i * spacing,
            YbaseX + triSize * 1.2, YbaseY + (i + 1) * spacing,
            YbaseX + triSize * 0.6, YbaseY + i * spacing
        ];
        tri.color = blue.slice();
        g_shapesList.push(tri);
    }
    // Right branch of Y
    for (let i = 0; i < 3; i++) {
        tri = new Triangle();
        tri.vertices = [
            YbaseX + 2 * triSize, YbaseY + i * spacing,
            YbaseX + 3.2 * triSize, YbaseY + (i + 1) * spacing,
            YbaseX + 2.6 * triSize, YbaseY + i * spacing
        ];
        tri.color = blue.slice();
        g_shapesList.push(tri);
    }
    // Bottom stem
    for (let i = 0; i < 4; i++) {
        tri = new Triangle();
        tri.vertices = [
            YbaseX + triSize, YbaseY - i * spacing,
            YbaseX + 2 * triSize, YbaseY - i * spacing,
            YbaseX + 1.5 * triSize, YbaseY - (i + 1) * spacing
        ];
        tri.color = blue.slice();
        g_shapesList.push(tri);
    }
    // Need black triangles here to make separation for Y more clear
    const topBlackOffsets = [
        [1.2, 3.2],
        [1.25, 3.4],
        [1.3, 3.5],
        [1.35, 3.3]
    ];
    topBlackOffsets.forEach(([dx, dy]) => {
        tri = new Triangle();
        tri.vertices = [
            YbaseX + dx * triSize, YbaseY + dy * spacing,
            YbaseX + (dx + 0.2) * triSize, YbaseY + dy * spacing,
            YbaseX + (dx + 0.1) * triSize, YbaseY + (dy + 0.2) * spacing
        ];
        tri.color = black.slice();
        g_shapesList.push(tri);
    });
}