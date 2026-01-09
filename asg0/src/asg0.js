var ctx;
var canvas;

function main() {
  canvas = document.getElementById('asg0');
  if (!canvas) {
    console.log('Failed to retrieve the <canvas> element');
    return false;
  }
  ctx = canvas.getContext('2d');
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
  if (isNaN(x1)) x1 = 0;
  var y1 = parseFloat(document.getElementById('ycoord').value);
  if (isNaN(y1)) y1 = 0;
  var x2 = parseFloat(document.getElementById('xcoord2').value);
  if (isNaN(x2)) x2 = 0;
  var y2 = parseFloat(document.getElementById('ycoord2').value);
  if (isNaN(y2)) y2 = 0;

  var v1 = new Vector3([x1, y1, 0]);
  var v2 = new Vector3([x2, y2, 0]);
  return [v1, v2];
}
function handleDrawEvent() {
  ctx.fillStyle = 'black';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  var [v1, v2] = getVectors();
  drawVector(v1, 'red');
  drawVector(v2, 'blue');
}
