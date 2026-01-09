//Student Name: Angela Yu
//Student ucsc email: annyu@ucsc.edu
var ctx;
var canvas;


function main() {
  canvas = document.getElementById('asg0');
  if (!canvas) {
    console.log('Failed to retrieve the <canvas> element');
    return false;
  }
  ctx = canvas.getContext('2d');


  // Black background
  ctx.fillStyle = 'black';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
}
function drawVector(v, color) {
  ctx.strokeStyle = color;
  ctx.beginPath();
  var originX = canvas.width / 2;
  var originY = canvas.height / 2;
  var x = v.elements[0] * 20;
  var y = v.elements[1] * 20;


  ctx.moveTo(originX, originY);
  ctx.lineTo(originX + x, originY - y);
  ctx.stroke();
}


function getVectors() {
  var x1 = parseFloat(document.getElementById('xcoord').value);
  if (isNaN(x1)){
    x1 = 0;
  }
  var y1 = parseFloat(document.getElementById('ycoord').value);
  if(isNaN(y1)){
    y1 = 0;
  }
  var x2 = parseFloat(document.getElementById('xcoord2').value);
  if (isNaN(x2)){
    x2 = 0;
  }
  var y2 = parseFloat(document.getElementById('ycoord2').value);
  if (isNaN(y2)){
    y2 = 0;
  }
  var v1 = new Vector3([x1, y1, 0]);
  var v2 = new Vector3([x2, y2, 0]);
  return [v1, v2];
}
function handleDrawEvent() {
  var [v1, v2] = getVectors();
  ctx.fillStyle = 'black';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  drawVector(v1, 'red');
  drawVector(v2, 'blue');
}
function handleDrawOperationEvent() {
  var [v1, v2] = getVectors();
  ctx.fillStyle = 'black';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  drawVector(v1, 'red');
  drawVector(v2, 'blue');
  var operator = document.getElementById('opt').value;
  if (operator === "Add") {
    helperAdd(v1, v2);
  } else if (operator === "Subtract") {
    helperSubtract(v1, v2);
  } else if (operator === "Multiply") {
    var s = parseFloat(document.getElementById('scalar').value);
    helperMultiply(v1, v2, s);
  } else if (operator === "Divide") {
    var s = parseFloat(document.getElementById('scalar').value);
    helperDivide(v1, v2, s);
  } else if (operator === "Mag") {
    helperMagnitude(v1, v2);
  } else if (operator === "Norm") {
    helperNormalize(v1, v2);
  } else if (operator === "Ang") {
    helperAngle(v1, v2);
  } else if (operator === "Area") {
    helperArea(v1, v2);
  }
}


// ~~ My Helper Functions ~~
function helperAdd(v1, v2) {
  var v1x = v1.elements[0];
  var v1y = v1.elements[1];
  var v1z = v1.elements[2];


  var v3 = new Vector3([v1x, v1y, v1z]);
  v3.add(v2);
  drawVector(v3, 'green');
}


function helperSubtract(v1, v2) {
  var v1x = v1.elements[0];
  var v1y = v1.elements[1];
  var v1z = v1.elements[2];


  var v3 = new Vector3([v1x, v1y, v1z]);
  v3.sub(v2);
  drawVector(v3, 'green');
}


function helperMultiply(v1, v2, s) {
  var v1x = v1.elements[0];
  var v1y = v1.elements[1];
  var v1z = v1.elements[2];
  var v2x = v2.elements[0];
  var v2y = v2.elements[1];
  var v2z = v2.elements[2];
  var v3 = new Vector3([v1x, v1y, v1z]);
  var v4 = new Vector3([v2x, v2y, v2z]);
  v3.mul(s);
  v4.mul(s);
  drawVector(v3, 'green');
  drawVector(v4, 'green');
}
function helperDivide(v1, v2, s) {
  var v1x = v1.elements[0];
  var v1y = v1.elements[1];
  var v1z = v1.elements[2];
  var v2x = v2.elements[0];
  var v2y = v2.elements[1];
  var v2z = v2.elements[2];
  var v3 = new Vector3([v1x, v1y, v1z]);
  var v4 = new Vector3([v2x, v2y, v2z]);
  v3.div(s);
  v4.div(s);
  drawVector(v3, 'green');
  drawVector(v4, 'green');
}
function helperMagnitude(v1, v2) {
  var mag1 = v1.magnitude();
  var mag2 = v2.magnitude();
  console.log("Magnitude v1: " + mag1);
  console.log("Magnitude v2: " + mag2);
}
function helperNormalize(v1, v2) {
  var v1x = v1.elements[0];
  var v1y = v1.elements[1];
  var v1z = v1.elements[2];
  var v2x = v2.elements[0];
  var v2y = v2.elements[1];
  var v2z = v2.elements[2];
  var v1n = new Vector3([v1x, v1y, v1z]);
  var v2n = new Vector3([v2x, v2y, v2z]);
  v1n.normalize();
  v2n.normalize();
  drawVector(v1n, 'green');
  drawVector(v2n, 'green');
}
function helperAngle(v1, v2) {
  var m1 = v1.magnitude();
  var m2 = v2.magnitude();
  var d = Vector3.dot(v1, v2);
  var ratio = d / (m1 * m2);
  var alphaRadians = Math.acos(ratio);
  var alphaDegrees = alphaRadians * (180 / Math.PI);
  console.log("Angle: " + alphaDegrees.toFixed(2) + "°");
}
function helperArea(v1, v2) {
  var cross = Vector3.cross(v1, v2);
  var crossMag = cross.magnitude();
  var area = crossMag / 2;
  console.log("Area of triangle: " + area.toFixed(2));
}


