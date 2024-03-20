const fs = require("fs");
const express = require("express");
const yaml = require("js-yaml");
const { rimrafSync } = require("rimraf");

const TileGenerator = require("./TileGenerator");

const Dimension = {
  Nether: -1,
  Overworld: 0,
  End: 1,
};

// ------------------- Load config -------------------

const config = yaml.load(fs.readFileSync("config.yaml", "utf8"));

// ------------------- Load worlds -------------------

if (config.imageGeneration.deleteStoredTilesOnStart) {
  const tiles = __dirname + "/tiles";
  rimrafSync(tiles);
  fs.mkdirSync(tiles);
}

let tileGen = {};

for (const worldName of fs.readdirSync(__dirname + "/worlds")) {
  const world = __dirname + "/worlds/" + worldName;
  if (!fs.statSync(world).isDirectory()) continue;

  tileGen[worldName] = new TileGenerator({
    world,
    unmined: config.imageGeneration.unmined,
    tileSize: config.imageGeneration.tileSize,
  });
}

// ------------------- Create app -------------------

const app = express();

// Set up serving views
app.set("view engine", "ejs");
app.set("views", __dirname + "/views");
app.use(express.static(__dirname + "/public"));

// serve views
app.get("/", (req, res) => {
  res.render("index");
});

// get tiles
app.get("/tile", (req, res) => {
  let id = { x: parseInt(req.query.x), y: parseInt(req.query.y) };
  let worldName = req.query.world;

  if (id.x === undefined || id.y === undefined || worldName === undefined) {
    res.status(400).send("Missing parameters.");
    return;
  } else if (Number.isNaN(id.x) || Number.isNaN(id.y)) {
    res.status(400).send("Invalid id.");
    return;
  } else if (tileGen[worldName] === undefined) {
    res.status(400).send("Invalid world.");
    return;
  }

  const world = `${__dirname}/tiles/${worldName}`;
  const tile = `${world}/${id.x} ${id.y}.png`;
  const tileExpiresIn = 500 * 1000;

  if (!fs.existsSync(world)) fs.mkdirSync(world, { recursive: true });
  if (fs.existsSync(tile)) {
    res.sendFile(tile);
  } else {
    tileGen[worldName]
      .getTile(tile, id, -1, Dimension.Overworld)
      .then(() => res.sendFile(tile, { maxAge: tileExpiresIn }));
  }
});

// get configuration
app.get("/config/:key(*)", (req, res) => {
  let keys = req.params.key.split("/");

  let requestedConfig = config;
  for (let key of keys) {
    requestedConfig = requestedConfig?.[key];
  }

  res.json(requestedConfig);
});

// get worlds
app.get("/worlds", (req, res) => {
  res.json(Array.from(Object.keys(tileGen)));
});

// Start the server
app.listen(config.port, () => {
  console.log(`Server is running on port ${config.port}`);
});
