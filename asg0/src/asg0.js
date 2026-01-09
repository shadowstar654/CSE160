var ctx;
var canvas;

function main() {
  canvas = document.getElementById('asg0');
  if (!canvas) {
    console.log('Failed to retrieve the <canvas> element');
    return false;
  }
  ctx = canvas.getContext('2d');
  handleDrawEvent();
}

function getVector() {
  var x1 = parseFloat(document.getElementById('xcoord').value);
  if (isNaN(x1)){
    x1 = 0;
  }

  var y1 = parseFloat(document.getElementById('ycoord').value);
  if (isNaN(y1)){
    y1 = 0;
  }
  return new Vector3([x1, y1, 0]);
}
function drawVector(v, color) {
  var originX = canvas.width / 2;
  var originY = canvas.height / 2;
  var scale = 20;
  var x = v.elements[0] * scale;
  var y = v.elements[1] * scale;
  ctx.strokeStyle = color;
  ctx.beginPath();
  ctx.moveTo(originX, originY);
  ctx.lineTo(originX + x, originY - y); 
  ctx.stroke();
}
function handleDrawEvent() {
  ctx.fillStyle = 'black';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  var v1 = getVector();
  drawVector(v1, 'red');
}
