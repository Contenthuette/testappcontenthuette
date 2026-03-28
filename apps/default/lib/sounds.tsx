import React, { createContext, useContext, useRef, useCallback, useState } from "react";
import { View, Platform } from "react-native";
import { WebView } from "react-native-webview";
import type { WebView as WebViewType } from "react-native-webview";

export type SoundType =
  | "tap"
  | "success"
  | "error"
  | "send"
  | "receive"
  | "ringtone"
  | "ringback"
  | "hangup";

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

// Pre-warm AudioContext on first user gesture, richer tones, lower latency
const SOUND_HTML = `
<!DOCTYPE html>
<html><head><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;overflow:hidden">
<script>
var ctx;
var compressor;
function C(){
  if(!ctx){
    ctx=new(window.AudioContext||window.webkitAudioContext)({latencyHint:'interactive'});
    // master compressor for consistent volume
    compressor=ctx.createDynamicsCompressor();
    compressor.threshold.value=-24;
    compressor.knee.value=12;
    compressor.ratio.value=4;
    compressor.connect(ctx.destination);
  }
  if(ctx.state==='suspended') ctx.resume();
  return ctx;
}
function D(){return compressor||C()&&compressor;}

var ringtoneInterval=null;
var ringbackInterval=null;
var ringbackTimeout=null;
var activeOscillators=[];

function osc(f,t0,dur,vol,type){
  var c=C(),d=D();
  var o=c.createOscillator();
  var g=c.createGain();
  o.type=type||'sine';
  if(typeof f==='number'){o.frequency.value=f;}
  else{o.frequency.setValueAtTime(f[0],t0);o.frequency.exponentialRampToValueAtTime(f[1],t0+dur);}
  g.gain.setValueAtTime(vol,t0);
  g.gain.exponentialRampToValueAtTime(0.001,t0+dur);
  o.connect(g);g.connect(d);
  o.start(t0);o.stop(t0+dur+0.01);
  activeOscillators.push(o);
  o.onended=function(){activeOscillators=activeOscillators.filter(function(x){return x!==o;});}
}

function tap(){
  var c=C(),t=c.currentTime;
  osc(1200,t,0.03,0.1);
  osc(2400,t,0.015,0.03);
}

function success(){
  var c=C(),t=c.currentTime;
  osc(523,t,0.1,0.16);
  osc(659,t+0.08,0.12,0.18);
  osc(784,t+0.16,0.15,0.12);
}

function error(){
  var c=C(),t=c.currentTime;
  osc([330,220],t,0.2,0.18);
  osc([660,440],t,0.12,0.06);
}

function send(){
  var c=C(),t=c.currentTime;
  osc([600,1400],t,0.07,0.1);
  osc([1200,2800],t,0.05,0.03);
}

function receive(){
  var c=C(),t=c.currentTime;
  osc(659,t,0.06,0.1);
  osc(880,t+0.06,0.1,0.13);
}

function hangup(){
  var c=C(),t=c.currentTime;
  osc([480,320],t,0.15,0.18,'sine');
  osc([620,400],t+0.12,0.15,0.13,'sine');
  osc([400,260],t+0.25,0.25,0.1,'sine');
}

function ringtoneOnce(){
  var c=C(),t=c.currentTime;
  // Two-note ascending ring with harmonics
  osc(523,t,0.15,0.2);
  osc(659,t+0.12,0.15,0.22);
  osc(1046,t,0.1,0.05);
  osc(1318,t+0.12,0.1,0.05);
}

function ringbackPulse(){
  var c=C(),t=c.currentTime;
  osc(440,t,0.14,0.07,'sine');
  osc(554,t+0.15,0.14,0.05,'sine');
}

function startRingtone(){
  stopRingtone();
  ringtoneOnce();
  ringtoneInterval=setInterval(ringtoneOnce,1400);
}

function stopRingtone(){
  if(ringtoneInterval){clearInterval(ringtoneInterval);ringtoneInterval=null;}
}

function ringbackBurst(){
  ringbackPulse();
  ringbackTimeout=setTimeout(ringbackPulse,350);
}

function startRingback(){
  stopRingback();
  ringbackBurst();
  ringbackInterval=setInterval(ringbackBurst,1600);
}

function stopRingback(){
  if(ringbackInterval){clearInterval(ringbackInterval);ringbackInterval=null;}
  if(ringbackTimeout){clearTimeout(ringbackTimeout);ringbackTimeout=null;}
}

var PLAY={tap:tap,success:success,error:error,send:send,receive:receive,ringtone:startRingtone,ringback:startRingback,hangup:hangup};
var STOP={ringtone:stopRingtone,ringback:stopRingback};

function onMsg(e){
  try{
    var d=JSON.parse(e.data);
    if(d.a==='p'&&PLAY[d.t]) PLAY[d.t]();
    else if(d.a==='s'&&STOP[d.t]) STOP[d.t]();
  }catch(x){}
}
window.addEventListener('message',onMsg);
document.addEventListener('message',onMsg);

// Pre-warm audio context immediately
try{C();}catch(e){}

if(window.ReactNativeWebView){
  window.ReactNativeWebView.postMessage(JSON.stringify({ready:true}));
}
</script>
</body></html>
`;

export function SoundProvider({ children }: { children: React.ReactNode }) {
  const webViewRef = useRef<WebViewType>(null);
  const [isReady, setIsReady] = useState(false);
  const queueRef = useRef<Array<{ a: string; t: SoundType }>>([]);

  const sendMessage = useCallback(
    (msg: { a: string; t: SoundType }) => {
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
