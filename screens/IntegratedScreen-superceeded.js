/** @format */

import React, { useState, useEffect } from "react";
import {
  StyleSheet,
  View,
  TouchableOpacity,
  Image,
  Text,
  Button,
} from "react-native";
import { Camera } from "expo-camera";
import { useNavigation } from "@react-navigation/native";
import * as ort from "onnxruntime-react-native";
import * as tf from "@tensorflow/tfjs";
import "@tensorflow/tfjs-react-native";
import * as ImageManipulator from "expo-image-manipulator";
import { Asset } from "expo-asset";
import { Alert } from "react-native";
import * as FaceDetector from "expo-face-detector";
import { captureRef } from "react-native-view-shot";

import {
  bundleResourceIO,
  decodeJpeg,
  resizeBilinear,
} from "@tensorflow/tfjs-react-native";

const IntegratedScreen = () => {
  const navigation = useNavigation();
  const [hasPermission, setHasPermission] = useState(null);
  const [cameraRef, setCameraRef] = useState(null);
  const [capturedImage, setCapturedImage] = useState(null);
  const [model, setModel] = useState(null);
  const [faces, setFaces] = useState([]);

  async function loadModel() {
    const assets = await Asset.loadAsync(require("../assets/mnist.ort"));
    console.log(assets);
    const modelUri = assets[0].localUri;
    if (!modelUri) {
      console.error("Failed to get model URI");
    } else {
      const loadedModel = await ort.InferenceSession.create(modelUri);
      setModel(loadedModel);
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

  const takePicture = async () => {
    await tf.ready();
    if (cameraRef) {
      const photo = await cameraRef.takePictureAsync();
      setCapturedImage(photo);

      // Reformat Image
      const reformattedImage = await ImageManipulator.manipulateAsync(
        photo.uri,
        [],
        { format: ImageManipulator.SaveFormat.JPEG, base64: true }
      );
      const imgB64 = reformattedImage.base64;

      // Use TensorFlow.js utility functions to process the image
      const imgBuffer = tf.util.encodeString(imgB64, "base64").buffer;
      const raw = new Uint8Array(imgBuffer);

      // Decode and resize the image
      const imageTensor = decodeJpeg(raw);
      const resizedImageTensor = tf.image.resizeBilinear(imageTensor, [28, 28]);

      const grayscaleImageTensor = tf.image.rgbToGrayscale(resizedImageTensor);

      const inputData = grayscaleImageTensor.toFloat().arraySync().flat();
      const normalizedInputData = inputData.map((value) => value / 255.0);

      try {
        const feeds = {};
        feeds[model.inputNames[0]] = new ort.Tensor(
          new Float32Array(normalizedInputData),
          [1, 28, 28]
        );
        const fetches = await model.run(feeds);
        const output = fetches[model.outputNames[0]];
        if (!output) {
          Alert.alert("failed to get output", `${model.outputNames[0]}`);
        } else {
          Alert.alert(
            "model inference successfully",
            `output shape: ${output.dims}, output data: ${output.data}`
          );
        }
      } catch (e) {
        Alert.alert("failed to inference model", `${e}`);
        throw e;
      }
    }
  };

  const handleFacesDetected = async ({ faces }) => {
    setFaces(faces);
    if (faces.length > 0 && !capturedImage) {
      // Process only the first detected face
      const firstFace = faces[0];

      try {
        // Capture the current frame
        // const result = await captureRef(cameraRef, {
        //   format: "png",
        //   quality: 1,
        // });
        const photo = await cameraRef.takePictureAsync();
        console.log(photo);
        setCapturedImage(photo);

        // Crop the image based on the first detected face
        // const { x, y } = firstFace.bounds.origin;
        // const { width, height } = firstFace.bounds.size;

        // if (photo) {
        //   const croppedImage = await ImageManipulator.crop(photo.uri, {
        //     offset: { x, y },
        //     size: { width, height },
        //   });

        //   setCapturedImage(croppedImage);
        // }

        // const croppedImage = await ImageManipulator.manipulateAsync(
        //   result,
        //   [],
        //   {
        //     format: ImageManipulator.SaveFormat.JPEG,
        //     // base64: true,
        //     crop: {
        //       height,
        //       width,
        //       originX: x,
        //       originY: y,
        //     },
        //   }
        // );

        // console.log(result);

        // Resize the cropped image to 256x256
        // const resizedImage = await ImageManipulator.manipulateAsync(
        //   croppedImage.uri,
        //   [{ resize: { width: 256, height: 256 } }],
        //   { format: "png" }
        // );
        // console.log(resizedImage.uri);
        // Set the captured and resized image
        // setCapturedImage(croppedImage.uri);
        // setCapturedImage(result);
      } catch (error) {
        console.error("Error processing captured image:", error);
      }
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
                mode: FaceDetector.FaceDetectorMode.fast,
                detectLandmarks: FaceDetector.FaceDetectorLandmarks.none,
                runClassifications:
                  FaceDetector.FaceDetectorClassifications.none,
                minDetectionInterval: 100,
                tracking: true,
              }}
              onFacesDetected={handleFacesDetected}
              ref={(ref) => setCameraRef(ref)}
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
                  <Text style={{ color: "black", fontSize: 28 }}>
                    Origin: x-{face.bounds.origin.x},y-
                    {face.bounds.origin.y} {index + 1}
                  </Text>
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
      {capturedImage && (
        <View
          style={{
            flex: 1,
            position: "absolute",
            width: "30%",
            height: "30%",
            right: 0,
            justifyContent: "center",
            alignItems: "center",
          }}
        >
          <Image
            source={{ uri: capturedImage.uri }}
            style={{ width: "100%", height: "100%" }}
          />
        </View>
      )}
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
