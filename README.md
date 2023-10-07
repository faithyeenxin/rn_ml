<!-- @format -->

# Technical Spike: React Native Expo + Model in ONNX format

Running Machine Learning model on the Front End

## Objective:

1.  load onnx/ort model on the front end
2.  convert images taken on mobile into Tensor format to be consumed by model

## Initializing Project

1. Prepare environment

- install Node.js
- install expo
  ```sh
  npm install -g expo-cli
  ```

2. Setup empty project

   ```bash
   expo init
   What would you like to name your app? … expo_rn_onnx_runtime
   Choose a template: › blank   a minimal app as clean as an empty canvas
   npm install onnxruntime-react-native
   ```

- within expo project, add in metro.config.js

  ```bash
  const { getDefaultConfig } = require("@expo/metro-config");
  const defaultConfig = getDefaultConfig(__dirname);

  <!-- to be able to recognize file types -->
  defaultConfig.resolver.assetExts.push("ort");
  defaultConfig.resolver.assetExts.push("onnx");

  module.exports = defaultConfig;
  ```

3. run code

   ```bash
   expo eject
   npm start ios / npm start android
   expo run:ios --device
   ```

## Model: Mnist.ort

Minist model was initially integrated into project with mock data - visible in MLScreen.js and camera functionality was tested separate from model - visible in CameraScreen.js.

```javascript
 const inputData = new Float32Array(28 * 28)
```

expo camera was then integrated and uri format image was reformatted (28x28 pixel) to a Tensor format and fed into model.

To note that model results are not accurate as cropping was not done accurately.
Checks as to whether number is captured within the cropped 28x28 pixel image was not done.

However model appears to be given the correct input (tensor format) and outputs were generated.

### Final Outcome:

| Andriod Device | Andriod Emulator | iOS Device | iOS Emulator |
| :------------: | :--------------: | :--------: | :----------: |
| Coming Soon... |  Coming Soon...  |     ✅     |      ✅      |
