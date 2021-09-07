
var storage = {
	request   : undefined,
	fileEntry : undefined,
	path      : undefined,
	ressource : undefined,
	onInit    : undefined,
	onLoaded  : undefined,
	size      : 300*1024*1024 // 300 mb
};

function setProgress(f) { // from 0 to 1
	var i = Math.round(f*100);
	var p = i + "%";
	var elem = document.getElementById("progressBar");
	elem.style.width = p;
	elem.innerHTML = p;
	elem.style.display = 'block';
	if (i == 100) elem.style.display = 'none';
}

function onErr(e) { console.log(e); };

function setupDB() {
	function onInit(db) {
		storage.database = db;
		if (storage.onInit) storage.onInit();
	};

	function onAllowed() {
		//window.webkitRequestFileSystem(window.PERSISTENT, storage.size, onInit, onErr);
	};
	//navigator.webkitPersistentStorage.requestQuota(storage.size, onAllowed);
}

function storeRessource() {
	console.log('store ressource under ' + storage.path);

	function onWriterReady(fileWriter) {
		fileWriter.onwriteend = function(e) { console.log('Write completed.'); };
		fileWriter.onerror = function(e) { console.log('Write failed: ' + e); };
		fileWriter.write( new Blob([storage.ressource]) );
	}

	function onEntryReady(fileEntry) {
		fileEntry.isFile === true;
		fileEntry.name == storage.path;
		fileEntry.fullPath == '/'+storage.path;
		fileEntry.createWriter( onWriterReady, onErr);
	};

	storage.database.root.getFile(storage.path, {create: true}, onEntryReady, onErr);
}

function setupRequest() {
	storage.request = new XMLHttpRequest();
	storage.request.responseType = 'arraybuffer';

	storage.request.onload = function(e) {
		var h = storage.request.getAllResponseHeaders();
		//var blob = new Blob( [ this.response ], { type: 'application/wasm' } );
		//storage.ressource = window.URL.createObjectURL( blob );
		storage.ressource = new Uint8Array(this.response);
		//storeRessource(); //AGRAJAG, disabled for Firefox
		if (storage.onLoaded) storage.onLoaded();
	};

	storage.request.onprogress = function(e) {
		setProgress(e.loaded/e.total);
	};
};

function loadRessource(p) {
	console.log('loadRessource');
	storage.path = p;
	console.log('load ressource!');
	storage.request.open( 'GET', storage.path, true );
	storage.request.send();
	console.log('loadRessource done');
};

function getRessource(p, force = false) {
	storage.path = p;

	function onFail(e) {
		if (!storage.ressource) loadRessource(storage.path);	
	}

	function onReaderReady(file) {
		var reader = new FileReader();
		reader.onloadend = function(e) {
			storage.ressource = new Uint8Array(this.result);
			console.log('found ressource in cache!');
			if (storage.onLoaded) storage.onLoaded();
		};
		reader.readAsArrayBuffer(file);
	}

	function onEntryReady(fileEntry) {
		fileEntry.isFile === true;
		fileEntry.name == storage.path;
		fileEntry.fullPath == '/'+storage.path;
		fileEntry.file( onReaderReady, onFail );
	};

	if (force) onFail(0);
	else storage.database.root.getFile(storage.path, {create: false}, onEntryReady, onFail);
};

function clearRessource(p) {
	console.log('clearRessource');
	function onSuccess(e) { console.log('Remove completed.'); };
	function onEntryReady(fileEntry) { fileEntry.remove(onSuccess, onErr); };
	storage.database.root.getFile(storage.path, {create: false}, onEntryReady, onErr);
	storage.path = undefined;
	storage.ressource = undefined;
	console.log('clearRessource done');
};

function initStorage(onInit, onLoaded) {
	storage.onInit = onInit;
	storage.onLoaded = onLoaded;
	setupRequest();
	setupDB();
}

