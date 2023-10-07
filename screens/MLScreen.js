/** @format */

import React, { useEffect, useState } from "react";
import { Alert, Button, StyleSheet, Text, View } from "react-native";
import { Asset } from "expo-asset";
import { useNavigation } from "@react-navigation/native";
import * as onnx from "onnxruntime-react-native";
import * as tf from "@tensorflow/tfjs";
import { decodeJpeg } from "@tensorflow/tfjs-react-native";
import * as ImagePicker from "expo-image-picker";
import * as ImageManipulator from "expo-image-manipulator";

const safasAsset = [
  {
    _downloadCallbacks: [],
    downloaded: true,
    downloading: false,
    hash: "5b4cfbe0c7a19e930175a939e23ad032",
    height: null,
    localUri:
      "file:///var/mobile/Containers/Data/Application/BFBB3FAD-47B1-4F40-B426-4CEE59DAE02F/Library/Caches/ExponentAsset-5b4cfbe0c7a19e930175a939e23ad032.onnx",
    name: "safas",
    type: "onnx",
    uri: "http://192.168.203.40:8081/assets/assets/safas.onnx?platform=ios&hash=5b4cfbe0c7a19e930175a939e23ad032",
    width: null,
  },
];

/* 
SAFAS INPUT 
Image Dimensions: 256, 256
*/

const MLScreen = () => {
  const navigation = useNavigation(); // Use the useNavigation hook here
  const [model, setModel] = useState(null);
  const [hasPermission, setHasPermission] = useState(null);
  const [imageUri, setImageUri] = useState();

  const getImagePickerPermissions = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    setHasPermission(status === "granted");
  };

  async function loadModel() {
    console.log("model is loading...");
    try {
      const assets = await Asset.loadAsync(
        require("../assets/safas_latest.onnx")
      );
      const modelUri = assets[0].localUri;
      if (!modelUri) {
        Alert.alert("failed to get model URI", `${assets[0]}`);
      } else {
        const loadedModel = await onnx.InferenceSession.create(modelUri);
        setModel(loadedModel);

        Alert.alert(
          "model loaded successfully",
          `myModel: ${JSON.stringify(loadedModel)}, input names: ${
            loadedModel.inputNames
          }, output names: ${loadedModel.outputNames}`
        );
      }
    } catch (e) {
      Alert.alert("failed to load model", `${e}`);
      throw e;
    }
  }
  const pickImage = async () => {
    console.log("picking image...");
    try {
      // Launch the image picker
      let result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 1,
      });

      if (!result.canceled) {
        setImageUri(result.assets[0].uri);
      }
    } catch (error) {
      console.error("Error picking an image:", error);
    }
  };

  useEffect(() => {
    if (imageUri) {
      runModel(imageUri);
    }
  }, [imageUri]);

  async function runModel(imageUri) {
    await tf.ready();
    const reformattedImage = await ImageManipulator.manipulateAsync(
      imageUri,
      [],
      { format: ImageManipulator.SaveFormat.JPEG, base64: true }
    );
    const imgB64 = reformattedImage.base64;

    // Use TensorFlow.js utility functions to process the image
    const imgBuffer = tf.util.encodeString(imgB64, "base64").buffer;
    const raw = new Uint8Array(imgBuffer);

    // // Decode and resize the image
    const imageTensor = decodeJpeg(raw);

    const inputData = new Float32Array(imageTensor.dataSync());

    // Assuming your model expects input shape [batch_size, height, width, channels]
    const inputShape = [1, 3, 256, 256];

    try {
      const feeds = {};
      feeds[model.inputNames[0]] = new onnx.Tensor(inputData, inputShape);
      const fetches = await model.run(feeds);
      const output = fetches[model.outputNames[0]];
      if (!output) {
        Alert.alert("failed to get output", `${model.outputNames[0]}`);
      } else {
        Alert.alert(
          "model inference successfully",
          `output shape: ${output.dims},output data: ${output.data},`
        );
      }
    } catch (e) {
      Alert.alert("failed to inference model", `${e}`);
      throw e;
    }
  }
  useEffect(() => {
    getImagePickerPermissions();
    loadModel();
  }, []);

  return (
    <View style={styles.container}>
      <Text>using ONNX Runtime for React Native</Text>
      <Button title="Load model" onPress={loadModel}></Button>
      {/* <Button title="Run" onPress={runModel}></Button> */}
      <Button title="Pick Image" onPress={pickImage}></Button>
      <Button
        title="Return to Welcome Screen"
        onPress={() => navigation.navigate("WelcomeScreen")}
      />
    </View>
  );
};

export default MLScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
  },
});
