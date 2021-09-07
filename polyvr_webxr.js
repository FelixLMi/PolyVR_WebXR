//

function xrResize() {
  var width = screen.width * window.devicePixelRatio;
  var height = screen.height * window.devicePixelRatio;

  if (navigator.userAgent.includes('Quest')){
    width = 1440*2*window.devicePixelRatio;//canvas.clientWidth * window.devicePixelRatio;
    height = 1660*window.devicePixelRatio;//canvas.clientHeight * window.devicePixelRatio;
    if (navigator.userAgent.includes('Quest 2')){}
  }

  //console.log(window.devicePixelRatio, canvasXR.clientWidth, window.screen.availWidth, window.innerWidth, screen.width, screen.height);
  //console.log(width, height);
  canvasXR.width = width; 
  canvasXR.height = height; 
  //console.log(canvasXR.width, canvasXR.height);
  if (typeof _glutReshapeWindow === "function") _glutReshapeWindow(canvasXR.width, canvasXR.height);
}

function initWebGL2(attributes) {
  canvasXR = document.getElementById('canvas');
  gl = canvasXR.getContext("webgl2", attributes || {alpha: false});
  if(!gl) {
    alert("This browser does not support WebGL 2.");
    return;
  }
  canvasXR.style = "position: absolute; width: 100%; height: 100%; left: 0; top: 0; right: 0; bottom: 0; margin: 0; z-index: -1;";
  document.body.appendChild(canvasXR);
  xrResize();
}

function onSessionStarted(_session) {
  xrSession = _session;
  xrSession.addEventListener("end", onSessionEnded);

  initWebGL2({xrCompatible: true});

  xrSession.updateRenderState({baseLayer: new XRWebGLLayer(xrSession, gl)});
  xrSession.requestReferenceSpace("local").then((refSpace) => { 
    xrRefSpace = refSpace;
    xrSession.requestAnimationFrame(onSessionFrame);
  });

  function onSessionFrame(t, frame) {
    const session = frame.session;
    session.requestAnimationFrame(onSessionFrame);
    let pose = frame.getViewerPose(xrRefSpace);
    
    if(pose) {
      let tr = pose.transform.position;
      let q1 = pose.transform.orientation;

      execScript('cam_handler',[tr.x.toString(), tr.y.toString(), tr.z.toString(),q1.x.toString(),q1.y.toString(),q1.z.toString(),q1.w.toString()]);
      //console.log(tr.x.toString(), tr.y.toString(), tr.z.toString(),q1.x.toString(),q1.y.toString(),q1.z.toString(),q1.w.toString());
      let glLayer = session.renderState.baseLayer;
  
      gl.bindFramebuffer(gl.FRAMEBUFFER, glLayer.framebuffer);
      //gl.clearColor(0.4, 0.7, 0.9, 1.0);
      //gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
      wasmTable.get(GLUT.displayFunc)();
    }
  }

  function onSessionEnded() {
    window.requestAnimationFrame(checkResize);
    xrSession = null;
    wasmTable.get(GLUT.displayFunc)();
  }
}

function toggleXR(){
  if(navigator.xr) {
    navigator.xr.isSessionSupported("immersive-ar").then((supported) => {
      if(supported) { 
        if(!xrSession) {
          navigator.xr.requestSession("immersive-ar").then(onSessionStarted);
        } else {
          xrSession.end();
        }
      }
    });
  }
}