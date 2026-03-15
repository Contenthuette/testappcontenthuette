import React, { useRef, useCallback, useImperativeHandle, forwardRef } from "react";
import { StyleSheet, View } from "react-native";
import { WebView } from "react-native-webview";
import type { WebViewMessageEvent } from "react-native-webview";

export interface LiveKitCallViewHandle {
  connect: (wsUrl: string, token: string, isVideoCall: boolean) => void;
  disconnect: () => void;
  toggleMute: () => void;
  toggleVideo: () => void;
  flipCamera: () => void;
}

interface LiveKitCallViewProps {
  onConnected?: () => void;
  onDisconnected?: () => void;
  onHangUp?: () => void;
  onError?: (message: string) => void;
  /** Fired when mute/video/flip state changes inside WebView */
  onControlState?: (state: { isMuted: boolean; isVideoOff: boolean }) => void;
}

const LIVEKIT_HTML = `
<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no">
<style>
*{margin:0;padding:0;box-sizing:border-box;-webkit-touch-callout:none;-webkit-user-select:none;touch-action:manipulation}
html,body{width:100%;height:100%;overflow:hidden;background:#111;font-family:-apple-system,BlinkMacSystemFont,sans-serif;color:#fff}

#app{display:flex;flex-direction:column;height:100%}
#videoGrid{flex:1;position:relative;display:flex;flex-wrap:wrap;align-items:center;justify-content:center;padding:8px;gap:8px}
.participant{position:relative;border-radius:16px;overflow:hidden;background:#222;display:flex;align-items:center;justify-content:center;min-height:120px}
.participant video{width:100%;height:100%;object-fit:cover}
.participant .nameTag{position:absolute;bottom:8px;left:8px;background:rgba(0,0,0,0.6);color:#fff;font-size:12px;padding:3px 10px;border-radius:20px;backdrop-filter:blur(8px);display:flex;align-items:center;gap:4px}
.participant .nameTag .muted{display:none;width:14px;height:14px}
.participant.is-muted .nameTag .muted{display:inline-block}
.participant .avatar{width:80px;height:80px;border-radius:50%;background:#333;display:flex;align-items:center;justify-content:center;font-size:28px;font-weight:600;color:rgba(255,255,255,0.6)}

.participant.solo{width:100%;height:100%}
.participant.duo{width:100%;height:calc(50% - 4px)}
.participant.grid{width:calc(50% - 4px);height:calc(50% - 4px)}

#localPip{position:absolute;top:60px;right:12px;width:110px;height:150px;border-radius:14px;overflow:hidden;z-index:20;background:#222;display:none;box-shadow:0 4px 20px rgba(0,0,0,0.5)}
#localPip video{width:100%;height:100%;object-fit:cover;transform:scaleX(-1)}

#statusOverlay{position:absolute;top:0;left:0;right:0;bottom:0;display:flex;align-items:center;justify-content:center;z-index:50;background:#111}
#statusOverlay.hidden{display:none}
#statusText{font-size:17px;color:rgba(255,255,255,0.5)}

#topBar{position:absolute;top:0;left:0;right:0;z-index:30;display:flex;align-items:center;justify-content:center;padding:max(env(safe-area-inset-top),12px) 16px 8px;background:linear-gradient(to bottom,rgba(0,0,0,0.6),transparent)}
#topBar .info{text-align:center}
#topBar .room-name{font-size:15px;font-weight:600}
#topBar .duration{font-size:12px;color:rgba(255,255,255,0.5);margin-top:2px}
</style>
</head>
<body>
<div id="app">
  <div id="statusOverlay"><span id="statusText">Verbinde…</span></div>
  <div id="topBar"><div class="info"><div class="room-name" id="roomLabel"></div><div class="duration" id="durationLabel">00:00</div></div></div>
  <div id="videoGrid"></div>
  <div id="localPip"></div>
</div>

<script src="https://cdn.jsdelivr.net/npm/livekit-client@2/dist/livekit-client.umd.min.js"><\/script>
<script>
var room=null,isMuted=false,isVideoOff=false,isVideoCall=false,durationTimer=null,startTime=0;

function msg(t,d){window.ReactNativeWebView&&window.ReactNativeWebView.postMessage(JSON.stringify(Object.assign({type:t},d||{})))}
function $(id){return document.getElementById(id)}
function initials(name){return(name||'?').split(' ').map(function(w){return w[0]}).join('').substring(0,2).toUpperCase()}

function syncState(){
  msg('controlState',{isMuted:isMuted,isVideoOff:isVideoOff});
}

function layoutParticipants(){
  var els=document.querySelectorAll('#videoGrid .participant');
  var n=els.length;
  els.forEach(function(el){
    el.classList.remove('solo','duo','grid');
    if(n===1)el.classList.add('solo');
    else if(n===2)el.classList.add('duo');
    else el.classList.add('grid');
  });
}

function addParticipant(identity,name,isLocal){
  if(document.getElementById('p-'+identity))return;
  var div=document.createElement('div');
  div.className='participant';
  div.id='p-'+identity;
  div.dataset.name=name||identity;
  var av=document.createElement('div');
  av.className='avatar';
  av.textContent=initials(name||identity);
  div.appendChild(av);
  var tag=document.createElement('div');
  tag.className='nameTag';
  tag.innerHTML='<svg class="muted" viewBox="0 0 24 24"><path fill="#EF4444" d="M19 11h-1.7c0 .74-.16 1.43-.43 2.05l1.23 1.23c.56-.98.9-2.09.9-3.28zm-4.02.17L8 4.18V4a4 4 0 018 0v7c0 .06 0 .11-.02.17zM4.27 3L3 4.27l6.01 6.01V11a4.001 4.001 0 005.36 3.77l1.63 1.63A6.97 6.97 0 0112 18c-3.86 0-7-3.14-7-7H3c0 4.08 3.05 7.44 7 7.93V22h2v-3.07c1.03-.13 2-.49 2.85-1.02L19.73 23 21 21.73 4.27 3z"/></svg>';
  tag.appendChild(document.createTextNode(isLocal?'Du':name||identity));
  div.appendChild(tag);
  $('videoGrid').appendChild(div);
  layoutParticipants();
}

function removeParticipant(identity){
  var el=document.getElementById('p-'+identity);
  if(el)el.remove();
  layoutParticipants();
}

function attachTrackToParticipant(track,identity,kind){
  var container=document.getElementById('p-'+identity);
  if(!container)return;
  if(kind==='video'){
    var existing=container.querySelector('video');
    if(existing)existing.remove();
    var el=track.attach();
    container.insertBefore(el,container.firstChild);
    var av=container.querySelector('.avatar');
    if(av)av.style.display='none';
  }else{
    var a=track.attach();
    a.id='audio-'+identity;
    document.body.appendChild(a);
  }
}

function detachVideoFromParticipant(identity){
  var container=document.getElementById('p-'+identity);
  if(!container)return;
  var vid=container.querySelector('video');
  if(vid)vid.remove();
  var av=container.querySelector('.avatar');
  if(av)av.style.display='flex';
}

function startDuration(){
  startTime=Date.now();
  durationTimer=setInterval(function(){
    var s=Math.floor((Date.now()-startTime)/1000);
    var m=Math.floor(s/60);
    var sec=s%60;
    $('durationLabel').textContent=(m<10?'0':'')+m+':'+(sec<10?'0':'')+sec;
  },1000);
}

/* ── Public API called from React Native ── */
window.rnConnect=async function(wsUrl,token,videoCall){
  try{
    isVideoCall=videoCall;
    var R=LivekitClient;
    room=new R.Room({adaptiveStream:true,dynacast:true,videoCaptureDefaults:{resolution:R.VideoPresets.h720.resolution}});

    room.on(R.RoomEvent.Connected,function(){
      $('statusOverlay').classList.add('hidden');
      startDuration();
      msg('connected');
      room.remoteParticipants.forEach(function(p){
        addParticipant(p.identity,p.name||p.identity,false);
        p.trackPublications.forEach(function(pub){
          if(pub.track&&pub.isSubscribed){
            attachTrackToParticipant(pub.track,p.identity,pub.track.kind===R.Track.Kind.Video?'video':'audio');
          }
        });
      });
    });

    room.on(R.RoomEvent.Disconnected,function(){
      clearInterval(durationTimer);
      msg('disconnected');
    });

    room.on(R.RoomEvent.ParticipantConnected,function(p){
      addParticipant(p.identity,p.name||p.identity,false);
    });

    room.on(R.RoomEvent.ParticipantDisconnected,function(p){
      removeParticipant(p.identity);
      var audioEl=document.getElementById('audio-'+p.identity);
      if(audioEl)audioEl.remove();
    });

    room.on(R.RoomEvent.TrackSubscribed,function(track,pub,p){
      if(track.kind===R.Track.Kind.Video){
        attachTrackToParticipant(track,p.identity,'video');
      }else if(track.kind===R.Track.Kind.Audio){
        attachTrackToParticipant(track,p.identity,'audio');
      }
    });

    room.on(R.RoomEvent.TrackUnsubscribed,function(track,pub,p){
      track.detach().forEach(function(e){e.remove()});
      if(track.kind===R.Track.Kind.Video){
        detachVideoFromParticipant(p.identity);
      }
    });

    room.on(R.RoomEvent.TrackMuted,function(pub,p){
      if(pub.source===R.Track.Source.Microphone){
        var el=document.getElementById('p-'+p.identity);
        if(el)el.classList.add('is-muted');
      }
    });

    room.on(R.RoomEvent.TrackUnmuted,function(pub,p){
      if(pub.source===R.Track.Source.Microphone){
        var el=document.getElementById('p-'+p.identity);
        if(el)el.classList.remove('is-muted');
      }
    });

    await room.connect(wsUrl,token);

    await room.localParticipant.setMicrophoneEnabled(true);
    if(videoCall){
      await room.localParticipant.setCameraEnabled(true);
      var cp=room.localParticipant.getTrackPublication(R.Track.Source.Camera);
      if(cp&&cp.track){
        var ve=cp.track.attach();
        $('localPip').appendChild(ve);
        $('localPip').style.display='block';
      }
    }

    syncState();
    msg('mediaReady');
  }catch(e){
    $('statusText').textContent='Fehler: '+e.message;
    msg('error',{message:e.message||'Connection failed'});
  }
};

window.rnDisconnect=async function(){
  if(room){try{await room.disconnect()}catch(e){}room=null}
};

/* Called from native buttons via injectJavaScript */
window.rnToggleMute=async function(){
  if(!room)return;
  isMuted=!isMuted;
  await room.localParticipant.setMicrophoneEnabled(!isMuted);
  syncState();
};

window.rnToggleVideo=async function(){
  if(!room||!isVideoCall)return;
  var R=LivekitClient;
  isVideoOff=!isVideoOff;
  await room.localParticipant.setCameraEnabled(!isVideoOff);
  var pip=$('localPip');
  if(!isVideoOff){
    var cp=room.localParticipant.getTrackPublication(R.Track.Source.Camera);
    if(cp&&cp.track){pip.innerHTML='';var v=cp.track.attach();pip.appendChild(v);pip.style.display='block'}
  }else{pip.style.display='none';pip.innerHTML=''}
  syncState();
};

window.rnFlipCamera=async function(){
  if(!room||!isVideoCall)return;
  var R=LivekitClient;
  var cp=room.localParticipant.getTrackPublication(R.Track.Source.Camera);
  if(cp&&cp.track){
    var s=cp.track.mediaStreamTrack?cp.track.mediaStreamTrack.getSettings():{};
    var nf=s.facingMode==='user'?'environment':'user';
    await cp.track.restartTrack({facingMode:nf});
  }
};

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
        disconnect() {
          inject("window.rnDisconnect()");
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
          };
          switch (data.type) {
            case "connected":
              props.onConnected?.();
              break;
            case "disconnected":
              props.onDisconnected?.();
              break;
            case "hangUp":
              props.onHangUp?.();
              break;
            case "error":
              props.onError?.(data.message ?? "Unknown error");
              break;
            case "controlState":
              props.onControlState?.({
                isMuted: data.isMuted ?? false,
                isVideoOff: data.isVideoOff ?? false,
              });
              break;
          }
        } catch {
          // ignore parse errors
        }
      },
      [props]
    );

    return (
      <View style={styles.container}>
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
  },
  webView: {
    flex: 1,
    backgroundColor: "#111",
  },
});
