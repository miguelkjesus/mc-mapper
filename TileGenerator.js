const formatUnicorn = require("format-unicorn/safe");
const { exec } = require("child_process");

class TileGenerator {
  constructor(options) {
    this.world = options.world;
    this.unmined = options.unmined;
    this.tileSize = options.tileSize;
  }

  getTile(output, id, lod, dimension) {
    let area = {
      x: this.tileSize.x * id.x,
      y: this.tileSize.y * -id.y,
      dx: this.tileSize.x * -lod,
      dy: this.tileSize.y * -lod,
    };
    let areaString = `${this.tileSize.unit}(${area.x},${area.y},${area.dx},${area.dy})`;

    return new Promise((res) => {
      exec(
        `${this.unmined} image render --world="${this.world}" --output="${output}" --zoom=${lod} --area=${areaString} --dimension=${dimension} --background=#000000`,
        () => res()
      );
    });
  }

  getTiles(outputFormat, minid, maxid, lod, dimension, callback) {
    for (let x = minid.x; x <= maxid.x; x++) {
      for (let y = minid.y; y <= maxid.x; y++) {
        let output = formatUnicorn(outputFormat, { "id.x": x, "id.y": y });
        this.getTile(output, { x, y }, lod, dimension).then(() =>
          callback?.({ x, y }, output)
        );
      }
    }
  }
}

module.exports = TileGenerator;
