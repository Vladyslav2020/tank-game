let socket = new WebSocket('ws://localhost:3000');

let dataFromServer = {};

socket.onopen = () => console.log('Connection opened');

socket.close = () => console.log('Connection closed');

let recievedData = false;

let cnv = document.querySelector('#canvas');
let ctx = cnv.getContext('2d');

cnv.width = 700;
cnv.height = 560;

let map,
    sizeMap,
    size,
    wallWide,
    tanks,
    myTank,
    tankTypes,
    tankWidth,
    tankHeight,
    timer,
    bullets;
let margin = { x: 5, y: 5 };
let tankMove = '';
let tankRotate = '';

socket.onmessage = event => {
    let message = event.data;
    dataFromServer = JSON.parse(message);
    if (!recievedData) {
        recievedData = true;
        map = dataFromServer.map;
        sizeMap = dataFromServer.sizeMap;
        size = dataFromServer.size;
        wallWide = dataFromServer.wallWide;
        tanks = dataFromServer.tanks;
        myTank = dataFromServer.myTank;
        tankTypes = dataFromServer.tankTypes;
        tankWidth = dataFromServer.tankWidth;

        if (dataFromServer?.bullets) bullets = dataFromServer.bullets;

        cnv.width = size * (sizeMap + 2);
        cnv.height = cnv.width;

        tankHeight = dataFromServer.tankHeight;
        myTank.image = new Image(tankWidth, tankHeight);
        myTank.image.src = myTank.src;
        for (let tank of tanks) {
            tank.image = new Image(tankWidth, tankHeight);
            tank.image.src = tank.src;
            tank.image.onload = () => {
                tank.ready = true;
            };
        }
        myTank.image.onload = () => {
            myTank.ready = true;
            tic();
            timer = setInterval(tic, 30);
        };
    } else {
        let tanksArr = [];
        for (let tank of tanks)
            tank.update = false;
        for (let tank of dataFromServer.tanks) {
            let flag = false;
            for (let i = 0; i < tanks.length; i++) {
                if (tanks[i].src === tank.src && !tanks[i].update) {
                    tanks[i].update = true;
                    tanks[i].x = tank.x;
                    tanks[i].y = tank.y;
                    tanks[i].rotation = tank.rotation;
                    tanksArr.push(tanks[i]);
                    flag = true;
                    break;
                }
            }
            if (!flag) {
                tank.image = new Image(tankWidth, tankHeight);
                tank.image.src = tank.src;
                tank.image.onload = () => {
                    tank.ready = true;
                };
                tanksArr.push(tank);
            }
        }
        tanks = tanksArr;
        if (dataFromServer?.bullets) bullets = dataFromServer.bullets;
    }
};

function wallFromDown(numb) {
    return numb & (2 ** 2);
}

function wallFromUp(numb) {
    return numb & (2 ** 0);
}

function wallFromRight(numb) {
    return numb & (2 ** 1);
}

function wallFromLeft(numb) {
    return numb & (2 ** 3);
}

function drawField(map, size) {
    for (let i = 0; i < map.length; i++)
        for (let j = 0; j < map[i].length; j++) {
            ctx.beginPath();
            ctx.lineWidth = 1;
            ctx.strokeStyle = 'rgb(190, 190, 190)';
            ctx.strokeRect(
                j * size + margin.x,
                i * size + margin.y,
                size,
                size,
            );
        }
    for (let i = 0; i < map.length; i++)
        for (let j = 0; j < map[i].length; j++) {
            ctx.beginPath();
            ctx.fillStyle = 'gray';
            if (wallFromUp(map[i][j])) {
                ctx.fillRect(
                    j * size - wallWide / 2 + margin.x,
                    i * size - wallWide / 2 + margin.y,
                    size + wallWide,
                    wallWide,
                );
            }
            if (wallFromRight(map[i][j])) {
                ctx.fillRect(
                    (j + 1) * size - wallWide / 2 + margin.x,
                    i * size - wallWide / 2 + margin.y,
                    wallWide,
                    size + wallWide,
                );
            }
            if (wallFromDown(map[i][j])) {
                ctx.fillRect(
                    j * size - wallWide / 2 + margin.x,
                    (i + 1) * size - wallWide / 2 + margin.y,
                    size + wallWide,
                    wallWide,
                );
            }
            if (wallFromLeft(map[i][j])) {
                ctx.fillRect(
                    j * size - wallWide / 2 + margin.x,
                    i * size - wallWide / 2 + margin.y,
                    wallWide,
                    size + wallWide,
                );
            }
        }
    for (let bullet of bullets) {
        if (bullet.x === -1 || bullet.y === -1) continue;
        ctx.fillStyle = 'red';
        ctx.beginPath();
        ctx.arc(bullet.x, bullet.y, 3, 0, Math.PI * 2);
        ctx.fill();
    }
    if (myTank.ready) {
        ctx.beginPath();
        ctx.translate(myTank.x, myTank.y);
        ctx.rotate(degToRad(myTank.rotation - 90));
        ctx.drawImage(
            myTank.image,
            -tankWidth / 2,
            -tankHeight / 2,
            tankWidth,
            tankHeight,
        );
        ctx.rotate(degToRad(-(myTank.rotation - 90)));
        ctx.translate(-myTank.x, -myTank.y);
    }

    for (let tank of tanks) {
        if (tank.ready) {
            ctx.beginPath();
            ctx.translate(tank.x, tank.y);
            ctx.rotate(degToRad(tank.rotation - 90));
            ctx.drawImage(
                tank.image,
                -tankWidth / 2,
                -tankHeight / 2,
                tankWidth,
                tankHeight,
            );
            ctx.rotate(degToRad(-(tank.rotation - 90)));
            ctx.translate(-tank.x, -tank.y);
        }
    }
}

function degToRad(angle) {
    return (angle * Math.PI) / 180;
}

function clearField() {
    ctx.fillStyle = 'white';
    ctx.fillRect(0, 0, cnv.width, cnv.height);
}

function updateTanks() {
    let flag = false;
    if (tankMove === 'forward') {
        myTank.x += myTank.speed * Math.cos(degToRad(myTank.rotation));
        myTank.y += myTank.speed * Math.sin(degToRad(myTank.rotation));
        flag = true;
    }
    if (tankMove === 'back') {
        myTank.x -= myTank.speed * Math.cos(degToRad(myTank.rotation));
        myTank.y -= myTank.speed * Math.sin(degToRad(myTank.rotation));
        flag = true;
    }
    if (tankRotate === 'left') {
        myTank.rotation -= 5;
        flag = true;
    }
    if (tankRotate === 'right') {
        myTank.rotation += 5;
        flag = true;
    }
    myTank.x = Math.max(myTank.x, margin.x + tankWidth / 2);
    myTank.y = Math.max(myTank.y, margin.y + tankHeight / 2);
    myTank.x = Math.min(myTank.x, margin.x + size * sizeMap - tankWidth / 2);
    myTank.y = Math.min(myTank.y, margin.y + size * sizeMap - tankHeight / 2);
    if (flag)
        socket.send(
            JSON.stringify({
                tank: { x: myTank.x, y: myTank.y, rotation: myTank.rotation },
            }),
        );
}

function tic() {
    clearField();
    updateTanks();
    drawField(map, size);
}

document.addEventListener('keydown', event => {
    if (event.keyCode === 37) {
        tankRotate = 'left';
    }
    if (event.keyCode === 39) {
        tankRotate = 'right';
    }
    if (event.keyCode === 38) {
        tankMove = 'forward';
    }
    if (event.keyCode === 40) {
        tankMove = 'back';
    }
    if (event.keyCode === 32) {
        let bullet = {};
        bullet.rotation = myTank.rotation;
        bullet.x =
            myTank.x + (tankWidth / 2) * Math.cos(degToRad(bullet.rotation));
        bullet.y =
            myTank.y + (tankHeight / 2) * Math.sin(degToRad(bullet.rotation));

        socket.send(
            JSON.stringify({
                tank: { x: myTank.x, y: myTank.y, rotation: myTank.rotation },
                bullet,
            }),
        );
    }
});

document.addEventListener('keyup', event => {
    if (event.keyCode === 37) {
        tankRotate = '';
    }
    if (event.keyCode === 39) {
        tankRotate = '';
    }
    if (event.keyCode === 38) {
        tankMove = '';
    }
    if (event.keyCode === 40) {
        tankMove = '';
    }
});

socket.onclose = () => {
    recievedData = false;
    location.reload();
};
