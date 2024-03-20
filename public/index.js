const map = document.getElementById("map");
const mouseCoords = {
  x: document.getElementById("mouse-coords-x"),
  y: document.getElementById("mouse-coords-y"),
};
const selectWorld = document.getElementById("select-world");

const TileUnit = {
  b: 1,
  c: 16,
  r: 256,
};

let config = {};
let tileSizeBlocks = {};
let worlds = [];
let selectedWorld = null;

(async () => {
  config = await (await fetch("/config/imageGeneration")).json();
  tileSizeBlocks = {
    x: config.tileSize.x * TileUnit[config.tileSize.unit],
    y: config.tileSize.y * TileUnit[config.tileSize.unit],
  };

  worlds = await (await fetch("/worlds")).json();
  for (let world of worlds) {
    let opt = new Option();
    opt.value = world;
    opt.innerText = world;
    selectWorld.appendChild(opt);
  }

  updateMapChildren();
})();

let zoom = 3;
const zoomMultiplier = 0.1;
const maxZoom = 5;
const minZoom = 1 / 5;
let worldOffset = {
  x: (window.innerWidth * 0.5) / zoom,
  y: (window.innerHeight * 0.5) / zoom,
};

// ------------------- Mouse Coords -------------------

function worldPosToScreen(world) {
  return {
    x: (world.x + worldOffset.x) * zoom,
    y: window.innerHeight - (world.y + worldOffset.y) * zoom,
  };
}

function screenPosToWorld(screen) {
  return {
    x: screen.x / zoom - worldOffset.x,
    y: (window.innerHeight - screen.y) / zoom - worldOffset.y,
  };
}

addEventListener("mousemove", (ev) => {
  const mousePos = screenPosToWorld({ x: ev.clientX, y: ev.clientY });
  mouseCoords.x.innerText = Math.round(mousePos.x);
  mouseCoords.y.innerText = Math.round(mousePos.y);
});

// ------------------- World Changed -------------------

selectWorld.onchange = () => {
  selectedWorld = selectWorld.options[selectWorld.selectedIndex].value;

  while (map.firstChild) {
    map.removeChild(map.lastChild);
  }
  updateMapChildren();
};

// ------------------- Map -------------------

let mouseDown = false;
let lastMousePos = undefined;
let deltaMousePos = undefined;
map.addEventListener("mousedown", () => (mouseDown = true));
map.addEventListener("mouseup", () => (mouseDown = false));

map.addEventListener("mousemove", (ev) => {
  if (lastMousePos === undefined) {
    lastMousePos = {
      x: ev.clientX,
      y: ev.clientY,
    };
  } else {
    deltaMousePos = {
      x: ev.clientX - lastMousePos.x,
      y: ev.clientY - lastMousePos.y,
    };
    lastMousePos = {
      x: ev.clientX,
      y: ev.clientY,
    };
  }

  if (mouseDown) {
    worldOffset.x += deltaMousePos.x / zoom;
    worldOffset.y += -deltaMousePos.y / zoom;

    updateMapChildren();
  }
});

map.addEventListener("wheel", (ev) => {
  ev.preventDefault();
  const dir = -ev.deltaY / 144;
  let lastZoom = zoom;
  zoom += zoom * zoomMultiplier * dir;
  zoom = Math.min(Math.max(zoom, minZoom), maxZoom);

  // this makes zooming happen centered on the mouse.
  // i dont know why the maths works, i figured it out on accident.
  let o = 1 / zoom - 1 / lastZoom;
  worldOffset.x += o * lastMousePos.x;
  worldOffset.y += o * (window.innerHeight - lastMousePos.y);

  updateMapChildren();
});

function positionElement(el) {
  let worldPos = getScreenPos(el);
  if (worldPos.x === undefined || worldPos.y === undefined) return;
  let screenPos = worldPosToScreen(worldPos);
  el.style.left = `${Math.floor(screenPos.x)}px`;
  el.style.top = `${Math.floor(screenPos.y)}px`;
}

function scaleElement(image) {
  if (!(image instanceof HTMLImageElement)) return;

  image.width = Math.ceil(tileSizeBlocks.x * zoom);
  image.height = Math.ceil(tileSizeBlocks.y * zoom);
}

function setWorldPos(el, pos) {
  el.dataset.worldX = pos.x;
  el.dataset.worldY = pos.y;
}

function getScreenPos(el) {
  return {
    x: parseInt(el.dataset.worldX),
    y: parseInt(el.dataset.worldY),
  };
}

function setTileId(el, id) {
  el.dataset.idX = id.x;
  el.dataset.idY = id.y;
}

function getTileId(el) {
  return {
    x: parseInt(el.dataset.idX),
    y: parseInt(el.dataset.idY),
  };
}

function updateMapChildren() {
  if (!worlds.includes(selectedWorld)) return;

  createRegions(selectedWorld);
  for (let el of map.children) {
    positionElement(el);
    scaleElement(el);
  }
}

function createRegions(world) {
  world ??= worlds[0];

  let rect = map.getBoundingClientRect();
  let blWorld = screenPosToWorld({ x: rect.left, y: rect.bottom });
  let trWorld = screenPosToWorld({ x: rect.right, y: rect.top });

  let blTileId = {
    x: Math.floor(blWorld.x / tileSizeBlocks.x),
    y: Math.floor(blWorld.y / tileSizeBlocks.y),
  };
  let trTileId = {
    x: Math.ceil(trWorld.x / tileSizeBlocks.x),
    y: Math.ceil(trWorld.y / tileSizeBlocks.y),
  };

  for (let idX = blTileId.x; idX < trTileId.x + 1; idX++) {
    for (let idY = blTileId.y; idY < trTileId.y + 1; idY++) {
      if (
        map.querySelector(`[data-id-x="${idX}"][data-id-y="${idY}"]`) !== null
      )
        continue;

      let tile = new Image();
      tile.draggable = false;
      tile.classList.add("tile");
      tile.src = `tile?x=${idX}&y=${idY}&world=${encodeURIComponent(world)}`;
      tile.onload = () => tile.classList.add("loaded");
      map.appendChild(tile);
      setWorldPos(tile, {
        x: idX * tileSizeBlocks.x,
        y: idY * tileSizeBlocks.y,
      });
      setTileId(tile, { x: idX, y: idY });
    }
  }
}
