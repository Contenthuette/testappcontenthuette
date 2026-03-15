import React, { useRef, useCallback, useImperativeHandle, forwardRef } from "react";
import { StyleSheet, View } from "react-native";
import { WebView } from "react-native-webview";
import type { WebViewMessageEvent } from "react-native-webview";

export interface LiveKitCallViewHandle {
  connect: (wsUrl: string, token: string, isVideoCall: boolean) => void;
  disconnect: () => void;
}

interface LiveKitCallViewProps {
  onConnected?: () => void;
  onDisconnected?: () => void;
  onHangUp?: () => void;
  onError?: (message: string) => void;
}

const LIVEKIT_HTML = `
<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no">
<style>
*{margin:0;padding:0;box-sizing:border-box}
html,body{width:100%;height:100%;overflow:hidden;background:#111;font-family:-apple-system,BlinkMacSystemFont,sans-serif;color:#fff}

/* ── Layout ── */
#app{display:flex;flex-direction:column;height:100%}
#videoGrid{flex:1;position:relative;display:flex;flex-wrap:wrap;align-items:center;justify-content:center;padding:8px;gap:8px}
.participant{position:relative;border-radius:16px;overflow:hidden;background:#222;display:flex;align-items:center;justify-content:center;min-height:120px}
.participant video{width:100%;height:100%;object-fit:cover}
.participant .nameTag{position:absolute;bottom:8px;left:8px;background:rgba(0,0,0,0.6);color:#fff;font-size:12px;padding:3px 10px;border-radius:20px;backdrop-filter:blur(8px);display:flex;align-items:center;gap:4px}
.participant .nameTag .muted{display:none;width:14px;height:14px}
.participant.is-muted .nameTag .muted{display:inline-block}
.participant .avatar{width:80px;height:80px;border-radius:50%;background:#333;display:flex;align-items:center;justify-content:center;font-size:28px;font-weight:600;color:rgba(255,255,255,0.6)}

/* Single participant = full width */
.participant.solo{width:100%;height:100%}
/* 2 participants = stacked */
.participant.duo{width:100%;height:calc(50% - 4px)}
/* 3+ = grid */
.participant.grid{width:calc(50% - 4px);height:calc(50% - 4px)}

/* Local PIP */
#localPip{position:absolute;top:60px;right:12px;width:110px;height:150px;border-radius:14px;overflow:hidden;z-index:20;background:#222;display:none;box-shadow:0 4px 20px rgba(0,0,0,0.5)}
#localPip video{width:100%;height:100%;object-fit:cover;transform:scaleX(-1)}

/* ── Controls bar ── */
#controls{display:flex;flex-direction:row;align-items:center;justify-content:center;gap:16px;padding:16px 20px;padding-bottom:max(env(safe-area-inset-bottom),16px);background:rgba(17,17,17,0.95);backdrop-filter:blur(10px)}
.ctrl-btn{width:52px;height:52px;border-radius:50%;border:none;display:flex;align-items:center;justify-content:center;cursor:pointer;transition:background 0.2s;background:rgba(255,255,255,0.12)}
.ctrl-btn svg{width:22px;height:22px;fill:#fff}
.ctrl-btn.active{background:#fff}
.ctrl-btn.active svg{fill:#111}
.ctrl-btn.hangup{width:64px;height:64px;background:#EF4444}
.ctrl-btn.hangup svg{width:28px;height:28px;fill:#fff}
.ctrl-btn:active{opacity:0.7}
.ctrl-btn:active{opacity:0.7;-webkit-tap-highlight-color:transparent}
*{-webkit-touch-callout:none;-webkit-user-select:none;touch-action:manipulation}

/* ── Status overlay ── */
#statusOverlay{position:absolute;top:0;left:0;right:0;bottom:0;display:flex;align-items:center;justify-content:center;z-index:50;background:#111}
#statusOverlay.hidden{display:none}
#statusText{font-size:17px;color:rgba(255,255,255,0.5)}

/* ── Top bar ── */
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
  <div id="controls">
    <button class="ctrl-btn" id="btnMute" onclick="toggleMute()">
      <svg viewBox="0 0 24 24"><path id="micIcon" d="M12 14a3 3 0 003-3V5a3 3 0 00-6 0v6a3 3 0 003 3zm5-3a5 5 0 01-10 0H5a7 7 0 0014 0h-2zm-4 8.93A7.001 7.001 0 0012 20v2h-2v-2a7.001 7.001 0 01-1-.07V22h2v-2.07z"/></svg>
    </button>
    <button class="ctrl-btn" id="btnVideo" onclick="toggleVideo()" style="display:none">
      <svg viewBox="0 0 24 24"><path id="camIcon" d="M17 10.5V7a1 1 0 00-1-1H4a1 1 0 00-1 1v10a1 1 0 001 1h12a1 1 0 001-1v-3.5l4 4V6.5l-4 4z"/></svg>
    </button>
    <button class="ctrl-btn hangup" id="btnHangup" onclick="hangUp()">
      <svg viewBox="0 0 24 24"><path d="M12 9c-1.6 0-3.15.25-4.6.72v3.1c0 .39-.23.74-.56.9-.98.49-1.87 1.12-2.66 1.85-.18.18-.43.28-.7.28-.28 0-.53-.11-.71-.29L.29 13.08a.956.956 0 010-1.36C3.42 8.78 7.52 7 12 7s8.58 1.78 11.71 4.72c.38.37.38.98 0 1.36l-2.48 2.48c-.18.18-.43.29-.71.29-.27 0-.52-.1-.7-.28-.79-.73-1.68-1.36-2.66-1.85a.991.991 0 01-.56-.9v-3.1C15.15 9.25 13.6 9 12 9z"/></svg>
    </button>
    <button class="ctrl-btn" id="btnFlip" onclick="flipCamera()" style="display:none">
      <svg viewBox="0 0 24 24"><path d="M9 12c0 1.66 1.34 3 3 3s3-1.34 3-3-1.34-3-3-3-3 1.34-3 3zm13-2V6.5l-4 4 4 4V11h-3.27A7.99 7.99 0 0012 4a7.99 7.99 0 00-6.73 7H2v1l4 4 4-4H7.27A5.99 5.99 0 0112 6a5.99 5.99 0 015.73 6H21V10z"/></svg>
    </button>
  </div>
</div>

<script src="https://cdn.jsdelivr.net/npm/livekit-client@2/dist/livekit-client.umd.min.js"><\/script>
<script>
var room=null,isMuted=false,isVideoOff=false,isVideoCall=false,durationTimer=null,startTime=0;

function msg(t,d){window.ReactNativeWebView&&window.ReactNativeWebView.postMessage(JSON.stringify(Object.assign({type:t},d||{})))}
function $(id){return document.getElementById(id)}
function initials(name){return(name||'?').split(' ').map(function(w){return w[0]}).join('').substring(0,2).toUpperCase()}

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
    if(videoCall){
      $('btnVideo').style.display='flex';
      $('btnFlip').style.display='flex';
    }
    var R=LivekitClient;
    room=new R.Room({adaptiveStream:true,dynacast:true,videoCaptureDefaults:{resolution:R.VideoPresets.h720.resolution}});

    room.on(R.RoomEvent.Connected,function(){
      $('statusOverlay').classList.add('hidden');
      startDuration();
      msg('connected');
      /* Add existing remote participants */
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

    /* Enable local tracks */
    await room.localParticipant.setMicrophoneEnabled(true);
    if(videoCall){
      await room.localParticipant.setCameraEnabled(true);
      /* Show local PIP */
      var cp=room.localParticipant.getTrackPublication(R.Track.Source.Camera);
      if(cp&&cp.track){
        var ve=cp.track.attach();
        $('localPip').appendChild(ve);
        $('localPip').style.display='block';
      }
    }

    msg('mediaReady');
  }catch(e){
    $('statusText').textContent='Fehler: '+e.message;
    msg('error',{message:e.message||'Connection failed'});
  }
};

window.rnDisconnect=async function(){
  if(room){try{await room.disconnect()}catch(e){}room=null}
};

/* ── UI button handlers ── */
async function toggleMute(){
  if(!room)return;
  isMuted=!isMuted;
  await room.localParticipant.setMicrophoneEnabled(!isMuted);
  $('btnMute').classList.toggle('active',isMuted);
}

async function toggleVideo(){
  if(!room||!isVideoCall)return;
  var R=LivekitClient;
  isVideoOff=!isVideoOff;
  await room.localParticipant.setCameraEnabled(!isVideoOff);
  $('btnVideo').classList.toggle('active',isVideoOff);
  var pip=$('localPip');
  if(!isVideoOff){
    var cp=room.localParticipant.getTrackPublication(R.Track.Source.Camera);
    if(cp&&cp.track){pip.innerHTML='';var v=cp.track.attach();pip.appendChild(v);pip.style.display='block'}
  }else{pip.style.display='none';pip.innerHTML=''}
}

async function flipCamera(){
  if(!room||!isVideoCall)return;
  var R=LivekitClient;
  var cp=room.localParticipant.getTrackPublication(R.Track.Source.Camera);
  if(cp&&cp.track){
    var s=cp.track.mediaStreamTrack?cp.track.mediaStreamTrack.getSettings():{};
    var nf=s.facingMode==='user'?'environment':'user';
    await cp.track.restartTrack({facingMode:nf});
  }
}

function hangUp(){
  msg('hangUp');
  if(room){room.disconnect().catch(function(){});room=null}
  clearInterval(durationTimer);
}

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
      }),
      [inject]
    );

    const handleMessage = useCallback(
      (event: WebViewMessageEvent) => {
        try {
          const data = JSON.parse(event.nativeEvent.data) as {
            type: string;
            message?: string;
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
