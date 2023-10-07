/** @format */

import React, { useState, useEffect, useRef } from "react";
import {
  StyleSheet,
  View,
  TouchableOpacity,
  Image,
  Text,
  Button,
  Dimensions,
} from "react-native";
import { Camera } from "expo-camera";
import { useNavigation } from "@react-navigation/native";
import * as onnx from "onnxruntime-react-native";
import * as tf from "@tensorflow/tfjs";
import "@tensorflow/tfjs-react-native";
import * as ImageManipulator from "expo-image-manipulator";
import * as MediaLibrary from "expo-media-library";
import { Asset } from "expo-asset";
import { Alert } from "react-native";
import * as FaceDetector from "expo-face-detector";
import { captureRef } from "react-native-view-shot";

import {
  bundleResourceIO,
  decodeJpeg,
  resizeBilinear,
} from "@tensorflow/tfjs-react-native";

const MIN_CONFIDENCE = 0.99;
const MODEL_DIMENSIONS = 256;

const IntegratedScreen = () => {
  const navigation = useNavigation();
  const cameraRef = useRef(null);
  const [detectFaces, setDetectFaces] = useState(false);
  const [hasPermission, setHasPermission] = useState(null);
  const [capturedImage, setCapturedImage] = useState(null);
  const [model, setModel] = useState(null);
  const [faces, setFaces] = useState([]);

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
        setTimeout(() => {
          setDetectFaces(true);
        }, "2000");
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

  const getCameraPermission = async () => {
    const { status } = await Camera.requestCameraPermissionsAsync();
    setHasPermission(status === "granted");
  };

  useEffect(() => {
    getCameraPermission();
    loadModel();
  }, []);

  const takePicture = async (face) => {
    console.log(`face: ${JSON.stringify(face, null, 2)}`);
    await tf.ready();
    if (cameraRef) {
      // Capture Image
      const photo = await cameraRef.current.takePictureAsync();
      console.log(`photo: ${JSON.stringify(photo, null, 2)}`);

      // Crop the image + Resize to Model Dimensions

      const { x, y } = face.bounds.origin;
      const { width, height } = face.bounds.size;
      console.log(
        Dimensions.get("window").width,
        Dimensions.get("window").height
      );
      const factor = Math.max(
        photo.width / Dimensions.get("window").width,
        photo.height / Dimensions.get("window").height
      );
      const cropDimensions = {
        originX: x * factor,
        originY: y * factor,
        width: width * factor,
        height: height * factor,
      };

      const reformattedImage = await ImageManipulator.manipulateAsync(
        photo.uri,
        [
          { crop: cropDimensions },
          { flip: ImageManipulator.FlipType.Horizontal },
          { resize: { height: MODEL_DIMENSIONS, width: MODEL_DIMENSIONS } },
        ],
        { format: ImageManipulator.SaveFormat.JPEG, base64: true }
      );

      await saveToGallery(reformattedImage.uri);
      const imgB64 = reformattedImage.base64;

      // Use TensorFlow.js utility functions to process + decode the image
      const imgBuffer = tf.util.encodeString(imgB64, "base64").buffer;
      const raw = new Uint8Array(imgBuffer);
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
  };

  const isFaceDetectionValid = (face) => {
    if (
      face.leftEyeOpenProbability > MIN_CONFIDENCE &&
      face.rightEyeOpenProbability > MIN_CONFIDENCE
    ) {
      return true;
    } else {
      return false;
    }
  };

  const handleFacesDetected = async ({ faces }) => {
    if (!detectFaces) {
      return;
    }
    setFaces(faces);

    if (faces.length > 1) {
      return;
    }

    if (faces.length === 1 && isFaceDetectionValid(faces[0])) {
      setDetectFaces(false);
      takePicture(faces[0]);
    }
  };

  const saveToGallery = async (uri) => {
    try {
      const asset = await MediaLibrary.createAssetAsync(uri);
    } catch (error) {
      console.error("Error saving image to gallery:", error);
    }
  };

  return (
    <View style={{ flex: 1 }}>
      {hasPermission === null ?? <View />}
      {hasPermission === false ?? <Text>No access to camera</Text>}
      <View style={{ flex: 1 }}>
        {hasPermission !== null && hasPermission !== false && (
          <View style={{ flex: 1 }}>
            <Camera
              style={{
                flex: 1,
                justifyContent: "center",
                alignItems: "center",
              }}
              type={Camera.Constants.Type.front}
              faceDetectorSettings={{
                mode: FaceDetector.FaceDetectorMode.accurate,
                detectLandmarks: FaceDetector.FaceDetectorLandmarks.none,
                runClassifications:
                  FaceDetector.FaceDetectorClassifications.all,
                minDetectionInterval: 100,
                tracking: true,
              }}
              ref={cameraRef}
              onFacesDetected={handleFacesDetected}
            />
            <View style={styles.facesContainer}>
              {faces.map((face, index) => (
                <View
                  key={index}
                  style={{
                    ...styles.face,
                    left: face.bounds.origin.x,
                    top: face.bounds.origin.y,
                    width: face.bounds.size.width,
                    height: face.bounds.size.height,
                  }}
                >
                  {faces.length === 1 && detectFaces === true && (
                    <Text style={{ color: "black", fontSize: 28 }}>
                      Origin: x-{face.bounds.origin.x},y-
                      {face.bounds.origin.y} {index + 1}
                    </Text>
                  )}
                  {faces.length > 1 && (
                    <Text style={{ color: "black", fontSize: 28 }}>
                      only 1 face can be recognized
                    </Text>
                  )}
                </View>
              ))}
            </View>
          </View>
        )}
      </View>
      <View
        style={{
          position: "absolute",
          bottom: 10,
          justifyContent: "center",
          padding: 20,
          zIndex: 1,
          width: "100%",
        }}
      >
        <TouchableOpacity
          onPress={() => navigation.navigate("WelcomeScreen")}
          style={{
            display: "flex",
            justifyContent: "center",
            backgroundColor: "blue",
            padding: 20,
            borderRadius: 10,
          }}
        >
          <Text
            style={{
              color: "white",
              textAlign: "center",
            }}
          >
            Return to Welcome Screen
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

export default IntegratedScreen;

const styles = StyleSheet.create({
  facesContainer: {
    position: "absolute",
    bottom: 0,
    right: 0,
    left: 0,
    top: 0,
    alignItems: "center",
    justifyContent: "center",
  },
  face: {
    padding: 10,
    borderWidth: 2,
    borderRadius: 2,
    position: "absolute",
    borderColor: "red",
    justifyContent: "center",
    backgroundColor: "transparent",
  },
});
