var XHR = function(method, ad, params) {
    var xhr = new XMLHttpRequest();
    xhr.onload = params.onload || null;
    xhr.open(method, ad);
    if (method == 'POST') {
        xhr.setRequestHeader('Content-Type', 'application/x-www-form-urlencoded');
    }
    var variables = params.variables || null
            , str = '';
    for (var i in variables) {
        str += i + '=' + encodeURIComponent(variables[i]) + '&';
    }
    xhr.send(str);
}

function init() {
	// Connect to the SocketIO server to retrieve ongoing games.
	socket = io.connect();
	socket.on('gamesList', function(data) {
                var ul = document.getElementById('lesParties');
                ul.innerHTML='';
                for(var p in data.gamesList) {
                    var li = document.createElement('li'); 
                    ul.appendChild( li );
                    li.innerHTML = "<a href='javascript:void(0);' onmouseover=\"showPreview('"+data.gamesList[p]+"')\" onclick=\"startGame('"+data.gamesList[p]+"')\">"+data.gamesList[p]+"</a>";
                    //li.appendChild( document.createTextNode( data.gamesList[p] ) );
                }
            }
        );
	socket.emit('loginPage');
}

function startGame(gameId) {
    document.getElementById("idGame").value = gameId;
    if (check())
        document.getElementById("nouvellePartie").submit();
}

function check() {
    if (document.getElementById("login").value === "") {
        alert("Indiquez un identifiant.");
        return false;
    }
    return true;
}

function showPreview(idGame) {
    XHR("GET", "/"+idGame, {onload: function(){drawPreview(this.responseText);}});
    document.getElementById("plateau_idGame").innerHTML = idGame;
}

function getCell(x, y) {
    return document.getElementById("plateau").rows[y].cells[x];
}

function drawPreview(game) {
    //alert(game);
    game = JSON.parse(game);
    var dataPlateau = game.board;
    var plateau = document.getElementById("plateau");
    plateau.innerHTML = "";
    var height = dataPlateau.length;
    var width = dataPlateau[0].length;
    for (var y = 0; y < height; y++) {
        var row = plateau.insertRow(-1);
        for (var x = 0; x < width; x++) {
            var cell = row.insertCell(-1);
            if (dataPlateau[y][x].g)
                cell.style.borderLeft = "1px black solid";
            if (dataPlateau[y][x].d)
                cell.style.borderRight = "1px black solid";
            if (dataPlateau[y][x].h)
                cell.style.borderTop = "1px black solid";
            if (dataPlateau[y][x].b)
                cell.style.borderBottom = "1px black solid";
        }
    }
    var robots = game.robots;
    for (var i = 0; i < robots.length; i++) {
        getCell(robots[i].column, robots[i].line).style.background = robots[i].color;
    }
    getCell(game.target.c, game.target.l).style.background = game.target.t;
    getCell(game.target.c, game.target.l).innerHTML = "<div></div>"
}