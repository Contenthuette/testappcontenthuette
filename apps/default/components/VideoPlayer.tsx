import React from "react";
import { View, StyleSheet } from "react-native";
import WebView from "react-native-webview";

interface VideoPlayerProps {
  uri: string;
  height: number;
  autoPlay?: boolean;
  loop?: boolean;
  showControls?: boolean;
}

export function VideoPlayer({ uri, height, autoPlay = false, loop = false, showControls = true }: VideoPlayerProps) {
  const autoPlayAttr = autoPlay ? "autoplay" : "";
  const loopAttr = loop ? "loop" : "";
  const controlsAttr = showControls ? "controls" : "";

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0">
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        html, body { width: 100%; height: 100%; background: #000; overflow: hidden; }
        video {
          width: 100%;
          height: 100%;
          object-fit: cover;
          display: block;
        }
      </style>
    </head>
    <body>
      <video
        src="${uri}"
        ${controlsAttr}
        ${autoPlayAttr}
        ${loopAttr}
        playsinline
        webkit-playsinline
        preload="metadata"
        poster=""
      />
    </body>
    </html>
  `;

  return (
    <View style={[styles.container, { height }]}>
      <WebView
        source={{ html }}
        style={styles.webview}
        allowsInlineMediaPlayback
        mediaPlaybackRequiresUserAction={false}
        scrollEnabled={false}
        bounces={false}
        javaScriptEnabled
        originWhitelist={["*"]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: "100%",
    backgroundColor: "#000",
    overflow: "hidden",
  },
  webview: {
    flex: 1,
    backgroundColor: "#000",
  },
});
