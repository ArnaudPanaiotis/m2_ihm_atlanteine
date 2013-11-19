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
    socket.on('participants', function(data) {
        var ul = document.getElementById('lesParticipants');
        ul.innerHTML = '';
        for (p in data.participants) {
            var li = document.createElement('li');
            ul.appendChild(li);
            li.appendChild(document.createTextNode(data.participants[p]));
        }
    });
    socket.on('FinalCountDown', function(data) {
        var ms = data.FinalCountDown;
        console.log("FinalCountDown : " + ms);
    });
    socket.on('TerminateGame', function(data) {
        h1 = document.querySelector('body > header > h1');
        h1.innerHTML += ' est terminée !';
    });
    socket.on('solutions', function(data) {
        console.log("Solutions are :\n" + JSON.stringify(data.solutions));
    });
    socket.emit('identification', {login: document.getElementById('login').value
                , idGame: document.getElementById('idGame').value}
    );
}

function addOnClickToCell(cell, x, y){
    cell.onclick = function(){addCellToProposition(x, y)};
}

function drawPlateau(dataPlateau) {
    var plateau = document.getElementById("plateau");
    var height = dataPlateau.length;
    var width = dataPlateau[0].length;
    for (var y = 0; y < height; y++) {
        var row = plateau.insertRow(-1);
        for (var x = 0; x < width; x++) {
            var cell = row.insertCell(-1);
            cell.style.border = "1px grey dotted";
            cell.style.padding = "0";
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
            addOnClickToCell(cell, x, y);
        }
    }
}

function getCell(x, y) {
    return document.getElementById("plateau").rows[y].cells[x];
}

// drawRobot(x, y, color) affiche un robot de couleur "color" dans la case (x,y) 
// drawRobot(x, y)        efface un robot dans la case (x,y)
function drawRobot(x, y, color) {
    var cell = getCell(x, y);
    if (color === undefined) {
        cell.style.background = "";
    } else {
        cell.style.background = "url('robot.png') " + color;
    }
}

// drawTarget(x, y, color) affiche une cible de couleur "color" dans la case (x,y) 
// drawTarget(x, y)        efface une cible dans la case (x,y)
function drawTarget(x, y, color) {
    var cell = getCell(x, y);
    if (color === undefined) {
        cell.style.background = "";
    } else {
        cell.style.background = "url('target.png') " + color;
    }
}

var robots;

function drawGame(gameJson) {
    //alert(gameJson);
    game = JSON.parse(gameJson);
    robots = game.robots;
    drawPlateau(game.board);
    for (var i = 0; i < robots.length; i++) {
        var robot = robots[i];
        drawRobot(robot.column, robot.line, robot.color);
    }
    drawTarget(game.target.c, game.target.l, game.target.t);
}

var proposition = [];
var selected = {};

function getRobot(c, l) {
    for (var i=0; i<robots.length; i++) {
        if (c === robots[i].column && l === robots[i].line)
            return robots[i].color;
    }
    return "";
}

function addCellToProposition(c, l) {
    var robot = getRobot(c, l);
    if (robot === "") {
        moveRobot(l, c);
        drawRobot(selected.column, selected.line);
        drawRobot(c, l, selected.robot);
    } else {
        selectRobot(robot);
        selected.robot = robot;
    }
    selected.column = c;
    selected.line = l;
}

function printProposition() {
    var div=document.getElementById("proposition");
    div.innerHTML = "";
    for (var i=0; i <proposition.length ; i++) {
        div.innerHTML += JSON.stringify(proposition[i]) + "<br/>"
    }
}

function popProposition() {
    proposition.pop();
    printProposition();
}

function deleteProposition() {
    proposition = "";
    printProposition();   
}

function selectRobot(color) {
    proposition.push({command:"select", robot:color});
    printProposition();
}

function moveRobot(line, column) {
    proposition.push({command:"move", line:line, column:column});
    printProposition();
}

function sendProposition(login, idGame) {
    XHR("POST", "/proposition", {variables: {login: login, idGame: idGame, proposition: JSON.stringify(proposition)}, onload: function() {alert(this.responseText);}});
}