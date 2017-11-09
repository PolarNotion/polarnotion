var canvas = document.getElementById('pixi_app');
var size = [1920, 1080];
var ratio = size[0] / size[1];
var appContainer = document.getElementById('app-container')

var app = new PIXI.Application({
  height: 1223,
  width: 2600,
  backgroundColor: 0xFFF9F1,
});
canvas.appendChild(app.view);

app.stage.interactive = true;

var container = new PIXI.Container();
app.stage.addChild(container);

var padding = 50;
var bounds = new PIXI.Rectangle(
  -padding,
  -padding,
  app.renderer.width + padding * 2,
  app.renderer.height + padding * 2
);

var displacementSprite = PIXI.Sprite.fromImage('./assets/pixi/cloud-map-3.jpg');
var displacementFilter = new PIXI.filters.DisplacementFilter(displacementSprite);

var enditSprite = PIXI.Sprite.fromImage('./assets/pixi/goodboii.jpg');
var enditFilter = new PIXI.filters.DisplacementFilter(enditSprite);

app.stage.addChild(displacementSprite);

container.filters = [displacementFilter];

displacementFilter.scale.x = 100;
displacementFilter.scale.y = 100;
displacementSprite.anchor.set(0.5);

var bg = PIXI.Sprite.fromImage('./assets/pixi/polar-logo-black.png');
bg.width = app.renderer.width;
bg.height = app.renderer.height;
bg.x = -50;
bg.y = -50;

bg.alpha = 1;

container.addChild(bg);

app.stage
  .on('mousemove', onPointerMove)
  .on('touchmove', onPointerMove);

var mouseX = 0;
var mouseY = 0;
var xp = 0;
var yp = 0;
var loop = setInterval(function(){
  // change divisor value to alter damping. higher is slower
  xp += (mouseX - xp) / 10;
  yp += (mouseY - yp) / 10;
  displacementSprite.position.set(xp - 25, yp);
}, 30);

function onPointerMove(eventData) {
  mouseX = eventData.data.global.x;
  mouseY = eventData.data.global.y; 
}

function resize() {
  if (window.innerWidth / window.innerHeight >= ratio) {
    var w = window.innerHeight * ratio;
    var h = window.innerHeight;
  } else {
    var w = window.innerWidth;
    var h = window.innerWidth / ratio;
  }
  app.renderer.view.style.width = w + 'px';
  app.renderer.view.style.height = h + 'px';
}

window.onresize = function(event) {
  resize();
  resize2();
};


//’secret’ specifies the numerical keystrokes that make up the word “endit”
var secret = "6978687384"; 
var input = "";
var timer;

//The following function sets a timer that checks for user input. You can change the variation in how long the user has to input by changing the number in ‘setTimeout.’ In this case, it’s set for 500 milliseconds or ½ second.
$(document).keyup(function(e) {
  input += e.which; 
  clearTimeout(timer);
  timer = setTimeout(function() { input = ""; }, 500);
  check_input();
});

//Once the time is up, this function is run to see if the user’s input is the same as the secret code
function check_input() {
  if(input == secret) {
    // replace filter with end it dog. Will take some refactoring of how we instantiate the app. 
  }
};


// ------  ALTERNATE APP FOR NETHER ZONE --------
var canvas2 = document.getElementById('pixi_app--alt');

var app2 = new PIXI.Application({
  height: 1223,
  width: 2600,
  backgroundColor: 0x000000,
});
canvas2.appendChild(app2.view);

app2.stage.interactive = true;

var container2 = new PIXI.Container();
app2.stage.addChild(container2);

var padding = 50;
var bounds = new PIXI.Rectangle(
  -padding,
  -padding,
  app2.renderer.width + padding * 2,
  app2.renderer.height + padding * 2
);

var displacementSprite2 = PIXI.Sprite.fromImage('./assets/pixi/goodboii.jpg');
var displacementFilter2 = new PIXI.filters.DisplacementFilter(displacementSprite2);

app2.stage.addChild(displacementSprite2);

container2.filters = [displacementFilter2];

displacementFilter2.scale.x = 100;
displacementFilter2.scale.y = 100;
displacementSprite2.anchor.set(0.5);

var bg2 = PIXI.Sprite.fromImage('./assets/pixi/polar-logo-red.png');
bg2.width = app2.renderer.width;
bg2.height = app2.renderer.height;
bg2.x = -50;
bg2.y = -50;

bg2.alpha = 1;

container2.addChild(bg2);

app2.stage
  .on('mousemove', onPointerMove2)
  .on('touchmove', onPointerMove2);

var mouseX2 = 0;
var mouseY2 = 0;
var xp2 = 0;
var yp2 = 0;
var loop2 = setInterval(function(){
  // change divisor value to alter damping. higher is slower
  xp2 += (mouseX2 - xp2) / 10;
  yp2 += (mouseY2 - yp2) / 10;
  displacementSprite2.position.set(xp2 - 25, yp2);
}, 30);

function onPointerMove2(eventData) {
  mouseX2 = eventData.data.global.x;
  mouseY2 = eventData.data.global.y; 
}

function resize2() {
  if (window.innerWidth / window.innerHeight >= ratio) {
    var w = window.innerHeight * ratio;
    var h = window.innerHeight;
  } else {
    var w = window.innerWidth;
    var h = window.innerWidth / ratio;
  }
  app2.renderer.view.style.width = w + 'px';
  app2.renderer.view.style.height = h + 'px';
}
