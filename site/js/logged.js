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
//        alert(JSON.stringify(data));
        setCountdown(data);
    });
    socket.on('TerminateGame', function(data) {
        h1 = document.querySelector('body > header > h1');
        h1.innerHTML += ' est terminée !';
//        alert(JSON.stringify(data));
    });
    socket.on('solutions', function(data) {
        console.log("Solutions are :\n" + JSON.stringify(data.solutions));
//        alert(JSON.stringify(data));
        displayWiners(data);
    });
    socket.emit('identification', {login: document.getElementById('login').value
                , idGame: document.getElementById('idGame').value}
    );
}

function drawPlateau(dataPlateau) {
    var plateau = document.getElementById("plateau");
    plateau.innerHTML = "";
    var height = dataPlateau.length;
    var width = dataPlateau[0].length;
    for (var y = 0; y < height; y++) {
        var row = plateau.insertRow(-1);
        for (var x = 0; x < width; x++) {
            var cell = row.insertCell(-1);
            if (dataPlateau[y][x].g)
                cell.style.borderLeft = "2px black solid";
            if (dataPlateau[y][x].d)
                cell.style.borderRight = "2px black solid";
            if (dataPlateau[y][x].h)
                cell.style.borderTop = "2px black solid";
            if (dataPlateau[y][x].b)
                cell.style.borderBottom = "2px black solid";
            cell.oncklick = undefined;
            cell.style.background = "";
        }
    }
}

function getCell(x, y) {
    return document.getElementById("plateau").rows[y].cells[x];
}

function addFunctionOnClick(cell, x, y, func) {
    cell.onclick = function(){func(x,y);};
}

// drawRobot(x, y, color) affiche un robot de couleur "color" dans la case (x,y) 
// drawRobot(x, y)        efface un robot dans la case (x,y)
function drawRobot(x, y, color) {
    var cell = getCell(x, y);
    if (color === undefined) {
        cell.onclick = undefined;
        cell.style.background = "";
    } else {
        cell.style.background = "url('robot.png') " + color;
        addFunctionOnClick(cell, x, y, selectRobot);
    }
}

// drawTarget(x, y, color) affiche une cible de couleur "color" dans la case (x,y) 
// drawTarget(x, y)        efface une cible dans la case (x,y)
function drawTarget(x, y, color) {
    var cell = getCell(x, y);
    if (color === undefined) {
        cell.style.background = "";
    } else {
        if (cell.style.background !== "" & cell.style.background.substr(0,3) !== "url")
            cell.style.background = "url('target_next.png') " + color;
        else
            cell.style.background = "url('target.png') " + color;
    }
}

// drawnext(x, y, color) affiche un mouvement possible de couleur "color" dans la case (x,y) 
// drawNext(x, y)        efface un mouvement possible dans la case (x,y)
function drawNext(x, y, color) {
    var cell = getCell(x, y);
    if (color === undefined) {
        cell.style.background = "";
        cell.onclick = undefined;
    } else {
        cell.style.background = color;
        addFunctionOnClick(cell, x, y, moveRobot);
    }
}

var robots;
var proposition = [];
var currentRobot = {};
var nextPositions = [];
var initGame;
var target;

function drawGame(gameJson) {
//    alert(gameJson);
    if (gameJson === undefined)
        gameJson = initGame;
    else
        initGame = gameJson;
    game = JSON.parse(gameJson);
    robots = game.robots;
    drawPlateau(game.board);
    for (var i = 0; i < robots.length; i++) {
        var robot = robots[i];
        drawRobot(robot.column, robot.line, robot.color);
    }
    target = game.target;
    drawTarget(game.target.c, game.target.l, game.target.t);
}

function getRobot(c, l) {
    for (var i=0; i<robots.length; i++) {
        if (c === robots[i].column && l === robots[i].line)
            return robots[i].color;
    }
    return "";
}

function selectRobot(x, y) {
    var robot = getRobot(x, y);
    if (robot === "")
        return;
    if (proposition.length !== 0 && proposition[proposition.length - 1].command === "select")
        proposition[proposition.length - 1].robot = robot;
    else
        proposition.push({command:"select", robot:robot});
    currentRobot.color = robot;
    currentRobot.x = x;
    currentRobot.y = y;
    currentRobot.nextX = x;
    currentRobot.nextY = y;
    sendProposition();
}

function moveRobot(x, y) {
    proposition.push({command:"move", line:y, column:x});
    currentRobot.nextX = x;
    currentRobot.nextY = y;
    sendProposition();
}

function sendProposition() {
    printProposition();
    XHR("POST", "/proposition", {
        variables: {
            login: document.getElementById('login').value,
            idGame: document.getElementById('idGame').value,
            proposition: JSON.stringify(proposition)},
        onload: function(){updatePlateau(JSON.parse(this.responseText));}});
}

function updatePlateau(answer) {
    if (answer.error !== undefined) {
        error("Requête mal formatée.");
        return;
    }
    switch (answer.state) {
        case "INVALID_MOVE":
            error("Déplacement impossible : "+answer.details);
            plateau.pop;
            break;
        case "INVALID_SELECT":
            error("Sélection impossible : "+answer.details);
            plateau.pop;
            break;
        case "INCOMPLETE":
        case "SUCCESS":
            drawRobot(currentRobot.x, currentRobot.y);
            for (var i = 0; i < nextPositions.length; i++) {
                drawNext(nextPositions[i].c, nextPositions[i].l);
            }
            nextPositions = answer.nextPositions;
            for (var i = 0; i < nextPositions.length; i++) {
                drawNext(nextPositions[i].c, nextPositions[i].l, currentRobot.color);
            }
            drawTarget(target.c, target.l, target.t);
            drawRobot(currentRobot.nextX, currentRobot.nextY, currentRobot.color);
            currentRobot.x = currentRobot.nextX;
            currentRobot.y = currentRobot.nextY;
            if (answer.state === "SUCCESS") {
                success("Vous avez Gagné !");
                for (var i = 0; i < proposition.length ;i++) {
                    if (proposition[i].command === "move")
                        getCell(proposition[i].column, proposition[i].line).onclick = undefined;
                }
               for (var i = 0; i < robots.length ;i++) {
                    getCell(robots[i].column, robots[i].line).onclick = undefined;
                }
            }
            break;
        default:
            error("state undefined");
    }
}

function printProposition() {
    var prop=document.getElementById("proposition");
    var color;
    prop.innerHTML = "<tr><td>X</td><td>Y</td></tr>";
    for (var i=0; i <proposition.length ; i++) {
        if (proposition[i].command === "select") {
            color = proposition[i].robot;
            //prop.innerHTML += "<tr class='select' style='border-color:"+color+"'></tr>";
        } else {
            prop.innerHTML += "<tr><td style='border-color:"+color+"'>"+proposition[i].column+"</td><td>"+proposition[i].line+"</td></tr>";
        }
    }
}

function deleteProposition() {
    proposition = [];
    printProposition();
    drawGame();
}

function error(text) {
    var div=document.getElementById("teuse");
    div.innerHTML = text;
    div.style.border = "2px solid red";
} 

function success(text) {
    var div=document.getElementById("teuse");
    div.innerHTML = text;
    div.style.border = "2px solid green";
}

function cancelLast() {
    if (proposition.length === 0)
        return;
    for (var i=0 ; i<nextPositions.length ; i++) {
        drawNext(nextPositions[i].c, nextPositions[i].l);
    }
    if (proposition[proposition.length-1].command === "move") {
        proposition.pop();
        drawRobot(currentRobot.x, currentRobot.y);
        if (proposition.length !== 0 && proposition[proposition.length-1].command === "move") {
            currentRobot.x = proposition[proposition.length-1].column;
            currentRobot.y = proposition[proposition.length-1].line;
        } else {
            var i;
            for (i=0 ; robots[i].color !== currentRobot.color ;i++);
            currentRobot.x = robots[i].column;
            currentRobot.y = robots[i].line;
        }
        currentRobot.nextX = currentRobot.x;
        currentRobot.nextY = currentRobot.y;
        drawRobot(currentRobot.x, currentRobot.y, currentRobot.color);
    } else {
        proposition.pop();
        if (proposition.lenght !== 0) {
            currentRobot.x = proposition[proposition.length-1].column;
            currentRobot.y = proposition[proposition.length-1].line;
            currentRobot.nextX = currentRobot.x;
            currentRobot.nextY = currentRobot.y;
            var i;
            for (i = proposition.length-1 ; proposition[i].command !== "select" ; i-- );
            currentRobot.color = proposition[i].robot;
        }
        //cancelLast();
    }
    sendProposition();
    printProposition();
}

function displayWiners(data) {
    var list = document.getElementById("lesParticipants").getElementsByTagName("li");
    for (var i=0 ; i<data.solutions.length ; i++) {
        for (var j=0 ; j<list.length ; j++) {
            if (list[j].innerHTML === data.solutions[i].player) {
                var len = 0;
                for (var k=0 ; k<data.solutions[i].proposition.length ;k++) {
                    if (data.solutions[i].proposition[k].command === "move")
                        len++;
                }
                if (len === 1)
                    list[j].innerHTML += " à gagné en 1 coup.";
                else
                    list[j].innerHTML += " à gagné en "+len+" coups.";
            }
        }
    }
}

function setCountdown(data) {
    var time = data.FinalCountDown / 1000;
    var interval;
    var timer = document.getElementById("timer");
    function countdown() {
        if (time === 1)
            timer.innerHTML = "Il reste 1 seconde !";
        else if (time === 0) {
            timer.innerHTML = "Partie terminée !";
            clearInterval(interval);
        }
        else
            timer.innerHTML = "Il reste " + time + " secondes !";
        time--;
    }
    countdown();
    interval = setInterval(countdown, 1000);
}

