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
import * as FaceDetector from "expo-face-detector";
const CameraScreen = () => {
  const navigation = useNavigation(); // Use the useNavigation hook here
  const [hasPermission, setHasPermission] = useState(null);
  const [faces, setFaces] = useState([]);

  useEffect(() => {
    (async () => {
      const { status } = await Camera.requestCameraPermissionsAsync();
      setHasPermission(status === "granted");
    })();
  }, []);

  const handleFacesDetected = ({ faces }) => {
    console.log(faces);
    setFaces(faces);
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
                  <Text style={{ color: "white" }}>Face {index + 1}</Text>
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

export default CameraScreen;

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
