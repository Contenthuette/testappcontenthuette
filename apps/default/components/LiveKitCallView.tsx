import React, { useRef, useCallback, useImperativeHandle, forwardRef } from "react";
import { StyleSheet, View } from "react-native";
import { WebView } from "react-native-webview";
import type { WebViewMessageEvent } from "react-native-webview";

export interface LiveKitCallViewHandle {
  connect: (wsUrl: string, token: string, isVideoCall: boolean) => void;
  toggleMute: () => void;
  toggleVideo: () => void;
  flipCamera: () => void;
  disconnect: () => void;
}

interface LiveKitCallViewProps {
  isVideoCall: boolean;
  onConnected?: () => void;
  onDisconnected?: () => void;
  onError?: (message: string) => void;
  onMuteChanged?: (isMuted: boolean) => void;
  onVideoChanged?: (isVideoOff: boolean) => void;
  onParticipantJoined?: (identity: string) => void;
  onParticipantLeft?: (identity: string) => void;
}

const LIVEKIT_HTML = `
<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no">
<style>
*{margin:0;padding:0;box-sizing:border-box}
html,body{width:100%;height:100%;overflow:hidden;background:transparent}
#videos{width:100%;height:100%;position:relative;display:flex;flex-wrap:wrap;align-items:center;justify-content:center}
.rv{width:100%;height:100%;object-fit:cover}
#videos.multi .rv{width:50%;height:50%;position:relative}
#pip{position:absolute;bottom:12px;right:12px;width:100px;height:140px;border-radius:12px;overflow:hidden;z-index:10;background:#222;display:none}
#pip video{width:100%;height:100%;object-fit:cover;transform:scaleX(-1)}
</style>
</head>
<body>
<div id="videos"></div>
<div id="pip"></div>
<script src="https://cdn.jsdelivr.net/npm/livekit-client@2/dist/livekit-client.umd.min.js"><\/script>
<script>
var room=null;
function msg(t,d){window.ReactNativeWebView&&window.ReactNativeWebView.postMessage(JSON.stringify(Object.assign({type:t},d||{})))}

window.rnConnect=async function(wsUrl,token,isVideo){
try{
var R=LivekitClient;
room=new R.Room({adaptiveStream:true,dynacast:true,videoCaptureDefaults:{resolution:R.VideoPresets.h720.resolution}});
room.on(R.RoomEvent.Connected,function(){msg('connected')});
room.on(R.RoomEvent.Disconnected,function(){msg('disconnected')});
room.on(R.RoomEvent.TrackSubscribed,function(track,pub,p){
if(track.kind===R.Track.Kind.Video){
var el=track.attach();el.className='rv';el.id='rv-'+p.identity;
document.getElementById('videos').appendChild(el);
var c=document.querySelectorAll('.rv').length;
if(c>1)document.getElementById('videos').classList.add('multi');
msg('remoteVideoOn')
}else if(track.kind===R.Track.Kind.Audio){
var a=track.attach();document.body.appendChild(a)
}
});
room.on(R.RoomEvent.TrackUnsubscribed,function(track,pub,p){
track.detach().forEach(function(e){e.remove()});
var c=document.querySelectorAll('.rv').length;
if(c<=1)document.getElementById('videos').classList.remove('multi');
if(track.kind===R.Track.Kind.Video)msg('remoteVideoOff')
});
room.on(R.RoomEvent.ParticipantConnected,function(p){msg('participantJoined',{identity:p.identity})});
room.on(R.RoomEvent.ParticipantDisconnected,function(p){msg('participantLeft',{identity:p.identity})});
await room.connect(wsUrl,token);
if(isVideo){
await room.localParticipant.setCameraEnabled(true);
await room.localParticipant.setMicrophoneEnabled(true);
var cp=room.localParticipant.getTrackPublication(R.Track.Source.Camera);
if(cp&&cp.track){
var ve=cp.track.attach();document.getElementById('pip').appendChild(ve);
document.getElementById('pip').style.display='block'
}
}else{
await room.localParticipant.setMicrophoneEnabled(true);
await room.localParticipant.setCameraEnabled(false)
}
msg('mediaReady')
}catch(e){msg('error',{message:e.message||'Connection failed'})}
};

window.rnToggleMute=async function(){
if(!room)return;
var on=room.localParticipant.isMicrophoneEnabled;
await room.localParticipant.setMicrophoneEnabled(!on);
msg('muteChanged',{isMuted:on})
};

window.rnToggleVideo=async function(){
if(!room)return;
var R=LivekitClient;
var on=room.localParticipant.isCameraEnabled;
await room.localParticipant.setCameraEnabled(!on);
var pip=document.getElementById('pip');
if(!on){
var cp=room.localParticipant.getTrackPublication(R.Track.Source.Camera);
if(cp&&cp.track){pip.innerHTML='';var v=cp.track.attach();pip.appendChild(v);pip.style.display='block'}
}else{pip.style.display='none';pip.innerHTML=''}
msg('videoChanged',{isVideoOff:on})
};

window.rnFlipCamera=async function(){
if(!room)return;
var R=LivekitClient;
var cp=room.localParticipant.getTrackPublication(R.Track.Source.Camera);
if(cp&&cp.track){
var s=cp.track.mediaStreamTrack?cp.track.mediaStreamTrack.getSettings():{};
var nf=s.facingMode==='user'?'environment':'user';
await cp.track.restartTrack({facingMode:nf})
}
};

window.rnDisconnect=async function(){if(room){await room.disconnect();room=null}};

msg('ready');
<\/script>
</body>
</html>
`;

export const LiveKitCallView = forwardRef<LiveKitCallViewHandle, LiveKitCallViewProps>(
  function LiveKitCallView(props, ref) {
    const webViewRef = useRef<WebView>(null);

    const inject = useCallback((js: string) => {
      webViewRef.current?.injectJavaScript(`${js}; true;`);
    }, []);

    useImperativeHandle(
      ref,
      () => ({
        connect(wsUrl: string, token: string, isVideoCall: boolean) {
          inject(
            `window.rnConnect(${JSON.stringify(wsUrl)},${JSON.stringify(token)},${isVideoCall})`
          );
        },
        toggleMute() {
          inject("window.rnToggleMute()");
        },
        toggleVideo() {
          inject("window.rnToggleVideo()");
        },
        flipCamera() {
          inject("window.rnFlipCamera()");
        },
        disconnect() {
          inject("window.rnDisconnect()");
        },
      }),
      [inject]
    );

    const handleMessage = useCallback(
      (event: WebViewMessageEvent) => {
        try {
          const data = JSON.parse(event.nativeEvent.data) as {
            type: string;
            message?: string;
            isMuted?: boolean;
            isVideoOff?: boolean;
            identity?: string;
          };
          switch (data.type) {
            case "connected":
              props.onConnected?.();
              break;
            case "disconnected":
              props.onDisconnected?.();
              break;
            case "error":
              props.onError?.(data.message ?? "Unknown error");
              break;
            case "muteChanged":
              if (data.isMuted !== undefined) props.onMuteChanged?.(data.isMuted);
              break;
            case "videoChanged":
              if (data.isVideoOff !== undefined)
                props.onVideoChanged?.(data.isVideoOff);
              break;
            case "participantJoined":
              if (data.identity) props.onParticipantJoined?.(data.identity);
              break;
            case "participantLeft":
              if (data.identity) props.onParticipantLeft?.(data.identity);
              break;
          }
        } catch {
          // ignore parse errors
        }
      },
      [props]
    );

    return (
      <View
        style={[
          styles.container,
          !props.isVideoCall && styles.hiddenAudio,
        ]}
      >
        <WebView
          ref={webViewRef}
          source={{ html: LIVEKIT_HTML }}
          style={styles.webView}
          onMessage={handleMessage}
          javaScriptEnabled
          domStorageEnabled
          mediaPlaybackRequiresUserAction={false}
          allowsInlineMediaPlayback
          mediaCapturePermissionGrantType="grant"
          originWhitelist={["*"]}
          scrollEnabled={false}
          bounces={false}
          overScrollMode="never"
          allowsFullscreenVideo={false}
          setSupportMultipleWindows={false}
        />
      </View>
    );
  }
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    borderRadius: 20,
    overflow: "hidden",
  },
  hiddenAudio: {
    position: "absolute",
    width: 1,
    height: 1,
    opacity: 0,
  },
  webView: {
    flex: 1,
    backgroundColor: "transparent",
  },
});
