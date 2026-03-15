import React, { createContext, useContext, useRef, useCallback, useState } from "react";
import { View, Platform } from "react-native";
import { WebView } from "react-native-webview";
import type { WebView as WebViewType } from "react-native-webview";

export type SoundType = "tap" | "success" | "error" | "send" | "receive" | "ringtone" | "hangup";

interface SoundContextValue {
  playSound: (type: SoundType) => void;
  stopSound: (type: SoundType) => void;
}

const SoundContext = createContext<SoundContextValue>({
  playSound: () => {},
  stopSound: () => {},
});

export function useSound() {
  return useContext(SoundContext);
}

const SOUND_HTML = `
<!DOCTYPE html>
<html><head><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;overflow:hidden">
<script>
var ctx;
function C(){
  if(!ctx) ctx=new(window.AudioContext||window.webkitAudioContext)();
  if(ctx.state==='suspended') ctx.resume();
  return ctx;
}
var ri=null;

function osc(f,t0,dur,vol,type){
  var c=C();
  var o=c.createOscillator();
  var g=c.createGain();
  o.type=type||'sine';
  if(typeof f==='number'){o.frequency.value=f;}
  else{o.frequency.setValueAtTime(f[0],t0);o.frequency.exponentialRampToValueAtTime(f[1],t0+dur);}
  g.gain.setValueAtTime(vol,t0);
  g.gain.exponentialRampToValueAtTime(0.001,t0+dur);
  o.connect(g);g.connect(c.destination);
  o.start(t0);o.stop(t0+dur+0.01);
}

function tap(){
  var c=C(),t=c.currentTime;
  osc(1200,t,0.035,0.12);
  // add a subtle harmonic for richness
  osc(2400,t,0.02,0.04);
}

function success(){
  var c=C(),t=c.currentTime;
  osc(523,t,0.12,0.18);
  osc(659,t+0.1,0.15,0.2);
  osc(784,t+0.2,0.18,0.12);
}

function error(){
  var c=C(),t=c.currentTime;
  osc([330,220],t,0.25,0.2);
  osc([660,440],t,0.15,0.08);
}

function send(){
  var c=C(),t=c.currentTime;
  osc([600,1400],t,0.09,0.12);
  osc([1200,2800],t,0.06,0.04);
}

function receive(){
  var c=C(),t=c.currentTime;
  osc(659,t,0.08,0.12);
  osc(880,t+0.08,0.14,0.15);
}

function hangup(){
  var c=C(),t=c.currentTime;
  osc([480,320],t,0.2,0.2,'sine');
  osc([620,400],t+0.15,0.2,0.15,'sine');
  osc([400,260],t+0.3,0.3,0.12,'sine');
}

function ringOnce(){
  var c=C(),t=c.currentTime;
  // Modern two-tone chime
  osc(523,t,0.18,0.22);
  osc(659,t+0.15,0.18,0.25);
  // Subtle overtones
  osc(1046,t,0.12,0.06);
  osc(1318,t+0.15,0.12,0.06);
}

function startRing(){
  stopRing();
  ringOnce();
  ri=setInterval(ringOnce,1500);
}
function stopRing(){
  if(ri){clearInterval(ri);ri=null;}
}

var H={tap:tap,success:success,error:error,send:send,receive:receive,ringtone:startRing,hangup:hangup};

function onMsg(e){
  try{
    var d=JSON.parse(e.data);
    if(d.a==='p'&&H[d.t]) H[d.t]();
    else if(d.a==='s'&&d.t==='ringtone') stopRing();
  }catch(x){}
}
window.addEventListener('message',onMsg);
document.addEventListener('message',onMsg);

if(window.ReactNativeWebView){
  window.ReactNativeWebView.postMessage(JSON.stringify({ready:true}));
}
</script>
</body></html>
`;

export function SoundProvider({ children }: { children: React.ReactNode }) {
  const webViewRef = useRef<WebViewType>(null);
  const [isReady, setIsReady] = useState(false);
  const queueRef = useRef<Array<{ a: string; t: string }>>([]);

  const sendMessage = useCallback(
    (msg: { a: string; t: string }) => {
      if (isReady && webViewRef.current) {
        webViewRef.current.postMessage(JSON.stringify(msg));
      } else {
        queueRef.current.push(msg);
      }
    },
    [isReady]
  );

  const handleReady = useCallback(() => {
    setIsReady(true);
    const queue = queueRef.current;
    queueRef.current = [];
    for (const msg of queue) {
      webViewRef.current?.postMessage(JSON.stringify(msg));
    }
  }, []);

  const playSound = useCallback(
    (type: SoundType) => {
      sendMessage({ a: "p", t: type });
    },
    [sendMessage]
  );

  const stopSound = useCallback(
    (type: SoundType) => {
      sendMessage({ a: "s", t: type });
    },
    [sendMessage]
  );

  return (
    <SoundContext.Provider value={{ playSound, stopSound }}>
      {children}
      {Platform.OS !== "web" && (
        <View
          style={{ position: "absolute", width: 1, height: 1, opacity: 0, top: -1 }}
          pointerEvents="none"
        >
          <WebView
            ref={webViewRef}
            source={{ html: SOUND_HTML }}
            originWhitelist={["*"]}
            javaScriptEnabled
            mediaPlaybackRequiresUserAction={false}
            allowsInlineMediaPlayback
            onMessage={(e) => {
              try {
                const data = JSON.parse(e.nativeEvent.data) as { ready?: boolean };
                if (data.ready) handleReady();
              } catch {
                // ignore
              }
            }}
            onError={() => setIsReady(false)}
          />
        </View>
      )}
    </SoundContext.Provider>
  );
}
