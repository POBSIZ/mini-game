# GNG - Phaser + Vite Game

A modern game development setup using Phaser 3 and Vite.

## Features

- ⚡ **Vite** - Lightning fast build tool
- 🎮 **Phaser 3** - Powerful 2D game framework
- 📦 **ES Modules** - Modern JavaScript
- 🎨 **CSS Styling** - Clean and responsive design

## Project Structure

```
src/
├── main.js              # Entry point and game configuration
├── scenes/
│   └── GameScene.js     # Main game scene
└── style/
    └── style.css        # Game styling
```

## Getting Started

### Development
```bash
npm run dev
```
Opens the development server at `http://localhost:5173`

### Build
```bash
npm run build
```
Creates a production build in the `dist` folder

### Preview
```bash
npm run preview
```
Preview the production build locally

## Game Features

- Interactive rectangle that changes color on click
- Keyboard input handling (arrow keys)
- Physics system ready for use
- Responsive canvas with modern styling

## Adding New Scenes

1. Create a new scene file in `src/scenes/`
2. Extend the `Phaser.Scene` class
3. Add the scene to the config in `main.js`

Example:
```javascript
// src/scenes/MenuScene.js
export default class MenuScene extends Phaser.Scene {
  constructor() {
    super({ key: 'MenuScene' });
  }
  
  create() {
    // Scene logic here
  }
}
```

## Assets

Place your game assets in the `public` folder to load them in your scenes.

## Development Tips

- Use `console.log()` for debugging
- Enable physics debug mode by setting `debug: true` in the arcade config
- Check the Phaser documentation for more advanced features
