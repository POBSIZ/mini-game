import Phaser from "phaser";
import RoguelikeScene from "./scenes/RoguelikeScene.js";
import CookingScene from "./scenes/CookingScene.js";
import "./style/style.css";

// Game configuration
const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  width: window.innerWidth,
  height: window.innerHeight,
  parent: "app",
  backgroundColor: "#2c3e50",
  scale: {
    mode: Phaser.Scale.RESIZE,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    // min: { width: 1920 * 3, height: 1080 * 3 },
  },
  render: {
    pixelArt: true,
    antialias: true,
    antialiasGL: true,
  },
  physics: {
    default: "arcade",
    arcade: {
      debug: false,
    },
  },
  input: {
    activePointers: 3,
    smoothFactor: 0.5,
    gamepad: false,
    keyboard: true,
    mouse: true, // 마우스 입력 복원
    touch: true, // 터치 입력 복원
  },
  scene: [RoguelikeScene, CookingScene],
};

// Start the game
const game = new Phaser.Game(config);
