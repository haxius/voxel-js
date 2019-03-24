class Voxel {
  constructor(element) {
    this.element = element;

    this.screen = {
      imagedata: null,
      bufarray: null, // color data
      buf8: null, // the same array but with bytes
      buf32: null, // the same array but with 32-Bit words
      backgroundcolor: 0xffe09090
    };

    this.camera = {
      x: 512, // x position on the map
      y: 800, // y position on the map
      height: 78, // height of the camera
      angle: 0, // direction of the camera
      horizon: 100, // horizon position (look up and down)
      distance: 800 // distance of map
    };

    this.input = {
      time: Date.now(),
      forwardbackward: 0,
      leftright: 0,
      updown: 0,
      lookup: false,
      lookdown: false,
      mouseposition: null,
      keypressed: false
    };

    this.map = {
      width: 1024,
      height: 1024,
      shift: 10, // power of two: 2^10 = 1024
      altitude: new Uint8Array(1024 * 1024), // 1024 * 1024 byte array with height information
      color: new Uint32Array(1024 * 1024), // 1024 * 1024 int array with RGB colors,
      urls: { color: "./C1W.png", height: "./D1.png" }
    };

    element.onkeydown = this.detectKeysDown;
    element.onkeyup = this.detectKeysUp;
    element.onmousedown = this.detectMouseDown;
    element.onmouseup = this.detectMouseUp;
    element.onmousemove = this.detectMouseMove;
    element.ontouchstart = this.detectMouseDown;
    element.ontouchend = this.detectMouseUp;
    element.ontouchmove = this.detectMouseMove;

    this.updating = false;

    this.loadMap();
  }

  updateCamera = () => {
    var current = Date.now();
    const { input, camera, map } = this;

    input.keypressed = false;
    if (input.leftright != 0) {
      camera.angle += input.leftright * 0.1 * (current - input.time) * 0.03;
      input.keypressed = true;
    }
    if (input.forwardbackward != 0) {
      camera.x -=
        input.forwardbackward *
        Math.sin(camera.angle) *
        (current - input.time) *
        0.03;
      camera.y -=
        input.forwardbackward *
        Math.cos(camera.angle) *
        (current - input.time) *
        0.03;
      input.keypressed = true;
    }
    if (input.updown != 0) {
      camera.height += input.updown * (current - input.time) * 0.03;
      input.keypressed = true;
    }
    if (input.lookup) {
      camera.horizon += 2 * (current - input.time) * 0.03;
      input.keypressed = true;
    }
    if (input.lookdown) {
      camera.horizon -= 2 * (current - input.time) * 0.03;
      input.keypressed = true;
    }

    // Collision detection. Don't fly below the surface.
    var mapoffset =
      (((Math.floor(camera.y) & (map.width - 1)) << map.shift) +
        (Math.floor(camera.x) & (map.height - 1))) |
      0;
    if (map.altitude[mapoffset] + 10 > camera.height)
      camera.height = map.altitude[mapoffset] + 10;

    input.time = current;
  };

  resize = () => {
    const { element, screen } = this;
    const { innerWidth, innerHeight } = window;

    const ctx = element.getContext("2d");
    const aspect = innerWidth / innerHeight;

    this.width = innerWidth < 800 ? innerWidth : 800;
    this.height = Math.floor(element.width / aspect);

    const { width, height } = this;

    element.width = width;
    element.height = height;

    screen.imagedata = ctx.createImageData(width < 800 ? width : 800, height);
    screen.bufarray = new ArrayBuffer(
      screen.imagedata.width * screen.imagedata.height * 4
    );
    screen.buf8 = new Uint8Array(screen.bufarray);
    screen.buf32 = new Uint32Array(screen.bufarray);
  };

  getMousePosition = ({
    pageX,
    pageY,
    type,
    targetTouches: [{ pageX: touchX, pageY: touchY } = {}] = []
  }) => {
    let result;

    // fix for Chrome
    if (type.startsWith("touch")) {
      result = [touchX, touchY];
    } else {
      result = [pageX, pageY];
    }

    return result;
  };

  detectMouseDown = e => {
    const { input } = this;

    input.forwardbackward = 3;
    input.mouseposition = this.getMousePosition(e);
    input.time = new Date().getTime();

    // if (!this.updating) window.requestAnimationFrame(s => this.tick(s));
  };

  detectMouseUp = () => {
    const { input } = this;

    input.mouseposition = null;
    input.forwardbackward = 0;
    input.leftright = 0;
    input.updown = 0;
  };

  detectMouseMove = e => {
    e.preventDefault();

    const { input, camera } = this;

    if (input.mouseposition == null) return;
    if (input.forwardbackward == 0) return;

    var currentMousePosition = this.getMousePosition(e);

    input.leftright =
      ((input.mouseposition[0] - currentMousePosition[0]) / window.innerWidth) *
      2;

    camera.horizon =
      100 +
      ((input.mouseposition[1] - currentMousePosition[1]) /
        window.innerHeight) *
        500;

    input.updown =
      ((input.mouseposition[1] - currentMousePosition[1]) /
        window.innerHeight) *
      10;
  };

  detectKeysDown = ({ keyCode }) => {
    const { input, updating } = this;

    switch (keyCode) {
      case 37: // left cursor
      case 65: // a
        input.leftright = +1;
        break;
      case 39: // right cursor
      case 68: // d
        input.leftright = -1;
        break;
      case 38: // cursor up
      case 87: // w
        input.forwardbackward = 3;
        break;
      case 40: // cursor down
      case 83: // s
        input.forwardbackward = -3;
        break;
      case 82: // r
        input.updown = +2;
        break;
      case 70: // f
        input.updown = -2;
        break;
      case 69: // e
        input.lookup = true;
        break;
      case 81: //q
        input.lookdown = true;
        break;
      default:
        return;
        break;
    }

    if (!updating) {
      input.time = new Date().getTime();
      // window.requestAnimationFrame(s => this.tick(s));
    }

    return false;
  };

  detectKeysUp = ({ keyCode }) => {
    const { input } = this;

    switch (keyCode) {
      case 37: // left cursor
      case 65: // a
        input.leftright = 0;
        break;
      case 39: // right cursor
      case 68: // d
        input.leftright = 0;
        break;
      case 38: // cursor up
      case 87: // w
        input.forwardbackward = 0;
        break;
      case 40: // cursor down
      case 83: // s
        input.forwardbackward = 0;
        break;
      case 82: // r
        input.updown = 0;
        break;
      case 70: // f
        input.updown = 0;
        break;
      case 69: // e
        input.lookup = false;
        break;
      case 81: //q
        input.lookdown = false;
        break;
      default:
        return;
        break;
    }

    return false;
  };

  flip = () => {
    const { element, screen } = this;
    const ctx = element.getContext("2d");

    screen.imagedata.data.set(screen.buf8);

    if (!this.hasLoggedImgData) {
      console.log(screen.imagedata);
      this.hasLoggedImgData = true;
    }

    ctx.putImageData(screen.imagedata, 0, 0);
  };

  getFps() {
    let fps = 0;

    if (!!this.last) {
      const delta = (Date.now() - this.last) / 1000;
      this.last = Date.now();
      fps = 1 / delta;
    } else {
      this.last = Date.now();
    }

    if (!!this.fps && !!this.fps.length) {
      this.fps.push(fps);
      if (100 < this.fps.length) {
        this.fps.shift();
      }
    } else {
      this.fps = [fps];
    }

    let reducer = (a, c) => a + c;
    let sum = this.fps.reduce(reducer);
    let avg = Math.floor(sum / this.fps.length);

    return avg;
  }

  drawDebug(s) {
    const { element, width, height } = this;
    const ctx = element.getContext("2d");
    const fps = this.getFps();

    ctx.font = "24px courier new";
    ctx.fillStyle = "black";
    ctx.textAlign = "left";
    ctx.fillText(`${width}x${height}@${fps}`, 36, 52);
  }

  tick(s) {
    this.updating = true;
    this.resize();
    this.updateCamera();
    this.drawVoxels();
    this.flip();
    this.drawDebug(s);

    if (!this.input.keypressed) {
      this.updating = false;
    }
    // } else {
      window.requestAnimationFrame(s => this.tick(s));
    // }
  }

  fetchImages = urls =>
    new Promise(resolve => {
      const {
        map: { width, height }
      } = this;
      const result = [];

      let pending = urls.length;

      if (0 === pending) {
        resolve([]);
        return;
      }

      urls.map((url, index) => {
        const image = new Image();

        image.onload = () => {
          const canvas = document.createElement("canvas");
          const context = canvas.getContext("2d");

          canvas.width = width;
          canvas.height = height;
          context.drawImage(image, 0, 0, width, height);

          result[index] = context.getImageData(0, 0, width, height).data;
          pending--;

          if (0 >= pending) resolve(result);
        };

        image.src = url;
      });
    });

  loadMap = () => {
    const {
      map,
      map: {
        urls: { color: colorMapUrl, height: heightMapUrl },
        width,
        height
      }
    } = this;

    this.fetchImages([colorMapUrl, heightMapUrl]).then(result => {
      const dataColor = result[0];
      const dataHeight = result[1];

      for (let i = 0; i < width * height; i++) {
        map.color[i] =
          0xff000000 |
          (dataColor[(i << 2) + 2] << 16) |
          (dataColor[(i << 2) + 1] << 8) |
          dataColor[(i << 2) + 0];

        map.altitude[i] = dataHeight[i << 2];
      }

      this.resize();
      window.requestAnimationFrame(s => this.tick(s));
      window.resize = this.resize;
    });
  };

  drawVerticalLine = (x, yTop, yBottom, col) => {
    const {
      width: screenWidth = 0,
      screen: { buf32 }
    } = this;

    x = x | 0;
    yTop = yTop | 0;
    yBottom = yBottom | 0;
    col = col | 0;

    if (yTop < 0) yTop = 0;
    if (yTop > yBottom) return;

    // get offset on screen for the vertical line
    var offset = (yTop * screenWidth + x) | 0;

    for (var k = yTop | 0; (k < yBottom) | 0; k = (k + 1) | 0) {
      buf32[offset | 0] = col | 0;
      offset = (offset + screenWidth) | 0;
    }
  };

  drawVoxels = () => {
    const {
      camera: {
        angle: cameraAngle,
        distance: cameraDistance,
        x: cameraX,
        y: cameraY,
        height: cameraHeight,
        horizon: cameraHorizon
      },
      map: { width: mapWidth, height: mapHeight, shift, altitude, color },
      width: screenWidth = 0,
      height: screenHeight = 0
    } = this;

    const mapWidthPeriod = mapWidth - 1;
    const mapHeightPeriod = mapHeight - 1;
    const sinAngle = Math.sin(cameraAngle);
    const cosAngle = Math.cos(cameraAngle);
    const hiddenY = new Int32Array(screenWidth);

    for (let i = 0; i < screenWidth; i = (i + 1) | 0) {
      hiddenY[i] = screenHeight;
    }

    var deltaZ = 1;

    // Draw from front to back
    for (var z = 1; z < cameraDistance; z += deltaZ) {
      // 90 degree field of view
      let plX = -cosAngle * z - sinAngle * z;
      let plY = sinAngle * z - cosAngle * z;
      const prX = cosAngle * z - sinAngle * z;
      const prY = -sinAngle * z - cosAngle * z;
      const dx = (prX - plX) / screenWidth;
      const dy = (prY - plY) / screenWidth;

      plX += cameraX;
      plY += cameraY;

      const invZ = (1 / z) * 240;

      for (let i = 0; (i < screenWidth) | 0; i = (i + 1) | 0) {
        const mapOffset =
          (((Math.floor(plY) & mapWidthPeriod) << shift) +
            (Math.floor(plX) & mapHeightPeriod)) |
          0;

        var heightOnScreen =
          ((cameraHeight - altitude[mapOffset]) * invZ + cameraHorizon) | 0;

        this.drawVerticalLine(i, heightOnScreen, hiddenY[i], color[mapOffset]);

        if (heightOnScreen < hiddenY[i]) hiddenY[i] = heightOnScreen;

        plX += dx;
        plY += dy;
      }
      deltaZ += 0.005;
    }
  };
}

new Voxel(document.getElementById("voxel"));
