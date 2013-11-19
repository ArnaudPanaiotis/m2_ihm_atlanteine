var XHR = function(method, ad, params) {
	var xhr = new XMLHttpRequest();
	xhr.onload = params.onload || null;
	xhr.open(method, ad);
	if(method == 'POST') {xhr.setRequestHeader('Content-Type', 'application/x-www-form-urlencoded');}
	var variables   = params.variables || null
	  , str			= '';
	for(var i in variables) {
		 str += i + '=' + encodeURIComponent( variables[i] ) + '&';
		}
	xhr.send( str );
}

function init() {
	// Connect to the SocketIO server to retrieve ongoing games.
	socket = io.connect();
	socket.on('participants', function(data) {
		 var ul = document.getElementById('lesParticipants');
		 ul.innerHTML='';
		 for(p in data.participants) {
			 var li = document.createElement('li'); 
			 ul.appendChild( li );
			 li.appendChild( document.createTextNode( data.participants[p] ) );
			}
		});
	socket.on('FinalCountDown'	, function(data) {
		 var ms   = data.FinalCountDown;
		 console.log("FinalCountDown : " + ms);
		});
	socket.on('TerminateGame'	, function(data) {
		 h1 = document.querySelector('body > header > h1');
		 h1.innerHTML += ' est terminée !';
		});
	socket.on('solutions'		, function(data) {
		 console.log("Solutions are :\n"+JSON.stringify(data.solutions));
		});
	socket.emit ('identification', 	{ login	: document.getElementById('login').value
									, idGame: document.getElementById('idGame').value}
				);
}

function drawPlateau(dataPlatau) {
    var plateau = document.getElementById("plateau");
    var height = dataPlateau.length;
    var width = dataPlateau[0].length;
    for (var y = 0 ; y < height ; y++) {
        var row = plateau.insertRow(-1);
        for (var x= 0 ; x < width ; x++) {
            var cell = row.insertCell(-1);
            cell.style.border = "1px grey dotted";
            cell.style.width = "30px";
            cell.style.height = "30px";
            if (dataPlateau[y][x].g)
                cell.style.borderLeft = "2px black solid";
            if (dataPlateau[y][x].d)
                cell.style.borderRight = "2px black solid";
            if (dataPlateau[y][x].h)
                cell.style.borderTop = "2px black solid";
            if (dataPlateau[y][x].b)
                cell.style.borderBottom = "2px black solid";
            cell.onmousedown = function(){beginDrag(x, y)};
            cell.onmouseover = function(){hoverDrag(x, y)};
            cell.onmouseout = function(){hoverDragOut(x, y)};
        }
    }
}

function getCell(x, y) {
    return document.getElementById("plateau").rows[y].cells[x];
}

// drawRobot(x, y, color) affiche un robot de couleur "color" dans la case (x,y) 
// drawRobot(x, y)        efface un robot dans la case (x,y)
function drawRobot(x, y, color) {
    if (color === undefined)
        color = "";
    var cell = getCell(x, y);
    cell.style.backgroundColor = color;
    if (color === "")
        cell.onmousedown = undefined;
    else
        cell.onmousedown = function(){beginDrag(x, y)};
}