var canvas = document.getElementById('pixi_app');
var size = [1920, 1080];
var ratio = size[0] / size[1];

var app = new PIXI.Application({
  height: 1080,
  width: 1920,
  backgroundColor: 0xFFF9F1,
});
canvas.appendChild(app.view);

app.stage.interactive = true;

var container = new PIXI.Container();
app.stage.addChild(container);

var padding = 100;
var bounds = new PIXI.Rectangle(
  -padding,
  -padding,
  app.renderer.width + padding * 2,
  app.renderer.height + padding * 2
);

var displacementSprite = PIXI.Sprite.fromImage('./assets/pixi/cloud-displacement-map.jpg');
var displacementFilter = new PIXI.filters.DisplacementFilter(displacementSprite);

app.stage.addChild(displacementSprite);

container.filters = [displacementFilter];

displacementFilter.scale.x = 120;
displacementFilter.scale.y = 120;
displacementSprite.anchor.set(0.5);

var bg = PIXI.Sprite.fromImage('./assets/pixi/warpable-screenshot.png');
bg.width = app.renderer.width;
bg.height = app.renderer.height;

bg.alpha = 1;

container.addChild(bg);

app.stage
  .on('mousemove', onPointerMove)
  .on('touchmove', onPointerMove);

function onPointerMove(eventData) {
   displacementSprite.position.set(eventData.data.global.x - 25, eventData.data.global.y);
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
};
