# Hastko Image Editor

A powerful web-based image editor with gradient mapping, levels adjustment, blur effects, and grain overlay. Built with vanilla JavaScript and HTML Canvas.

## Features

- 🎨 Gradient Map with 4-color stops
- 📊 Advanced Levels Control (Black, White, Midtones)
- 🌫️ Gaussian Blur Effect
- 🌾 Customizable Grain Overlay
- 💾 Save/Load Presets
- ↩️ Undo/Redo Support
- 📱 Responsive Design
- 💻 Works Offline

## Live Demo

Visit [https://[your-username].github.io/Hastko-image/](https://[your-username].github.io/Hastko-image/)

## Local Development

1. Clone the repository:
```bash
git clone https://github.com/[your-username]/Hastko-image.git
cd Hastko-image
```

2. Start a local server (choose one):
   - Using Python 3:
     ```bash
     python3 -m http.server 3000
     ```
   - Using the included development server (with auto-reload):
     ```bash
     python3 dev_server.py
     ```

3. Open your browser and visit `http://localhost:3000`

## Usage

1. Click "Choose Image" to upload an image
2. Adjust the gradient map colors using the color pickers
3. Fine-tune the levels using the sliders:
   - Black Level: Adjusts the darkest points
   - Midtones: Controls the middle tones
   - White Level: Adjusts the brightest points
4. Add blur effect if desired
5. Apply grain effect and adjust its properties
6. Save your settings as presets for future use
7. Use undo/redo for experimentation
8. Click "Save Image" to download the result

## Contributing

Pull requests are welcome. For major changes, please open an issue first to discuss what you would like to change.

## License

[MIT](https://choosealicense.com/licenses/mit/)
