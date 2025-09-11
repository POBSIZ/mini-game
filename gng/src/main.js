import Phaser from "phaser";
import RoguelikeScene from "./scenes/RoguelikeScene.js";
import CookingScene from "./scenes/CookingScene.js";
import "./style/style.css";

// Game configuration
const config = {
  type: Phaser.AUTO,
  width: window.innerWidth,
  height: window.innerHeight,
  parent: "app",
  backgroundColor: "#2c3e50",
  scale: {
    mode: Phaser.Scale.RESIZE,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  physics: {
    default: "arcade",
    arcade: {
      debug: true,
    },
  },
  scene: [RoguelikeScene, CookingScene],
};

// Start the game
const game = new Phaser.Game(config);
