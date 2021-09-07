//polyvr webasm start


function checkResize(time) {
  if (!xrSession) {
    var displayWidth  = canv.clientWidth;
    var displayHeight = canv.clientHeight;
    if (canv.width  != displayWidth || canv.height != displayHeight) {
      console.log("checkResize "+time + displayWidth + displayHeight);
      if (typeof _glutReshapeWindow === "function") _glutReshapeWindow(displayWidth, displayHeight);
    }
  }
  window.requestAnimationFrame(checkResize);
}

function onPreRun() {
  ENV.PYTHONHOME = "/python:/python";
}

function onInit() {
  getRessource('polyvr.wasm', true); // force reload for developing
}

var onLoaded = function() { 
  console.log(' loaded polyvr wasm!'); 
  var script = document.createElement('script');
  script.onload = function() { onScriptLoaded(); };
  script.src = 'polyvr.js';
  document.body.appendChild(script);
  checkResize(0); // start resize check loop
};

function preloadFile(path) {
  var parent = '/';
  var file = path;
  if (path.indexOf('/') > -1) {
    parent = '/' + path.replace(/\/[^\/]+$/, '');
    FS.createPath('/', parent, true, true);
    parent = '/'+parent;
    file = path.split("/").pop();
  }
  console.log('preloadFile: ' + path + ", file: " + file + " in parent folder: " + parent);
  FS.createPreloadedFile(parent, file, path, true, true);		
};

function scanDir(path, onGet) {
  //console.log('scanDir '+path);
  req = new XMLHttpRequest();
  req.onreadystatechange = function() {
    if (req.readyState == 4 && req.status === 200) {
      var data = req.responseText.split('|||');
      onGet( { 'dirs':data[0].split('|'), 'files':data[1].split('|') } )
    }
  }
  req.open("GET", 'scanDir.php?path='+path, true);
  req.send(null);
}

function preloadFolder(path, stack = []) {
  console.log('preloadFolder '+path);
  FS.mkdir('/'+path);
  scanDir(path, function(content) {
    var files = content.files;
    if (files.length > 0 && files[0] != "") {
      for (var file in content.files) preloadFile(path+"/"+files[file]);
    }
    var dirs = content.dirs;
    if (dirs.length > 0 && dirs[0] != "") {
      for(var i=0;i<dirs.length;i++) dirs[i]=path+"/"+dirs[i];
      stack.push.apply(stack, dirs);
    }
    if (stack.length > 0) preloadFolder(stack.pop(), stack);
  });
};

// utils functions
function wasmStr(s) {
  ptr = allocate(intArrayFromString(s),0);
  setTimeout(function(){ _free(ptr); }, 5000);
  return ptr;
}

function wasmStrVec(v) {
  var N = v.length;
  //console.log("Länge ist: ", N);
  var arr = new Uint32Array(N);
  for (var i=0; i<N; i++) arr[i] = wasmStr(v[i]);
  ptr = Module._malloc(arr.length * arr.BYTES_PER_ELEMENT);
  allocations.push(ptr);
  Module.HEAPU32.set(arr, ptr >> 2);
  return ptr;
}

function execScript(s, p) {
  //__ZN3OSG20PolyVR_triggerScriptEPKcPS1_i(wasmStr(s), wasmStrVec(p), p.length);
  __Z20PolyVR_triggerScriptPKcPS0_i(wasmStr(s), wasmStrVec(p), p.length);
  for (var i=0; i<allocations.length; i++) _free(allocations[i]);
  allocations = [];
}

function executeScript(sName) {
  sNamePtr = allocate(intArrayFromString(sName), 0);
  __Z20PolyVR_triggerScriptPKcPS0_i(sNamePtr, [], 0);
  _free(sNamePtr);
}

function stop() {
  console.log(' stop PolyVR!'); 
  __ZN3OSG15PolyVR_shutdownEv();
}

function reload() {
  console.log(' reload scene!');
  FS.unlink('test.pvr');
  preloadFile('test.pvr');
  setTimeout( function() { __ZN3OSG18PolyVR_reloadSceneEv(); }, 2000 );
}