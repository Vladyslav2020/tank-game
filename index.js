const ws = require('ws');

const server = new ws.Server({ port: 3000 });

const clients = new Map();

const data = {
    map: [],
    sizeMap: 6,
    size: 50,
    wallWide: 5,
    tanks: [],
    bullets: [],
    tankTypes: ['blue', 'dark', 'red', 'green', 'blue', 'sand'],
    tankWidth: 30,
    tankHeight: 30,
};

function init() {
    data.map = generateLabirint(data.sizeMap);
}

init();

function generateLabirint(size) {
    let map = [];
    for (let i = 0; i < size; i++) map.push([]);
    for (let i = 0; i < size; i++)
        for (let j = 0; j < size; j++) map[i].push(0);
    for (let i = 0; i < size; i++) {
        map[0][i] |= 2 ** 0;
        map[i][size - 1] |= 2 ** 1;
        map[size - 1][i] |= 2 ** 2;
        map[i][0] |= 2 ** 3;
    }
    return map;
}

function getRandomWall(size) {
    let x = Math.floor(Math.random() * size);
    let y = Math.floor(Math.random() * size);
    let pos = 2 ** Math.floor(Math.random() * 4);
    return { x, y, pos };
}

function addTank() {
    let margin = { x: 5, y: 5 };
    let coord = {
        x:
            Math.floor(Math.random() * data.sizeMap) * data.size +
            data.size / 2 +
            margin.x,
        y:
            Math.floor(Math.random() * data.sizeMap) * data.size +
            data.size / 2 +
            margin.y,
    };
    let tank = {
        x: coord.x,
        y: coord.y,
        speed: 2,
        type: data.tankTypes[Math.floor(Math.random() * data.tankTypes.length)],
        rotation: Math.floor(Math.random() * 360),
    };
    tank.src = `./tanks/tank_${tank.type}.png`;
    return tank;
}

function validCoords(x, y) {
    let margin = { x: 5, y: 5 };
    if (
        x >= margin.x + 3 &&
        x < margin.x + data.size * data.sizeMap - 3 &&
        y >= margin.y + 3 &&
        y < margin.y + data.size * data.sizeMap - 3
    )
        return true;
    return false;
}

server.on('connection', ws => {
    let tank = addTank();
    clients.set(ws, tank);
    data.tanks = Array.from(clients.entries())
        .filter(item => item[0] !== ws)
        .map(item => item[1]);
    data.myTank = tank;
    ws.send(JSON.stringify(data));
    for (let client of clients) {
        if (client[0] !== ws) {
            let tanks = Array.from(clients.entries())
                .filter(item => item[0] !== client[0])
                .map(item => item[1]);
            client[0].send(JSON.stringify({ tanks }));
        }
    }
    ws.on('message', message => {
        let client = clients.get(ws);
        let response = JSON.parse(message);
        let tank = response.tank;
        client.x = tank.x;
        client.y = tank.y;
        client.rotation = tank.rotation;
        for (client of clients) {
            if (client[0] !== ws) {
                let tanks = Array.from(clients.entries())
                    .filter(item => item[0] !== client[0])
                    .map(item => item[1]);
                client[0].send(JSON.stringify({ tanks }));
            }
        }
        if (response?.bullet) {
            let flag = false;
            for (let i = 0; i < data.bullets.length; i++)
                if (data.bullets[i].x === -1 && data.bullets[i].y === -1) {
                    data.bullets[i] = response.bullet;
                    flag = true;
                    break;
                }
            if (!flag) data.bullets.push(response.bullet);
        }
    });
    ws.on('close', () => {
        clients.delete(ws);
        for (let client of clients) {
            let tanks = Array.from(clients.entries())
                .filter(item => item[0] !== client[0])
                .map(item => item[1]);
            client[0].send(JSON.stringify({ tanks }));
        }
    });
});

server.on('message', ws => {});

function degToRad(angle) {
    return (angle * Math.PI) / 180;
}

function dist(x1, y1, x2, y2) {
    return Math.sqrt(Math.pow(x1 - x2, 2) + Math.pow(y1 - y2, 2));
}

setInterval(() => {
    for (let bullet of data.bullets) {
        bullet.x += 5 * Math.cos(degToRad(bullet.rotation));
        bullet.y += 5 * Math.sin(degToRad(bullet.rotation));
        for (let client of clients) {
            if (
                dist(bullet.x, bullet.y, client[1].x, client[1].y) <=
                0.7 *
                    Math.sqrt(
                        (data.tankWidth / 2) ** 2 + (data.tankHeight / 2) ** 2,
                    )
            ) {
                bullet.x = -1;
                bullet.y = -1;
                client[0].close();
                client[0].readyState = 3;
                clients.delete(client[0]);
                break;
            }
        }
        if (!validCoords(bullet.x, bullet.y)) {
            bullet.x = -1;
            bullet.y = -1;
        }
    }
    for (let client of clients) {
        let tanks = Array.from(clients.entries())
            .filter(item => item[0] !== client[0])
            .map(item => item[1]);
        client[0].send(JSON.stringify({ tanks, bullets: data.bullets }));
    }
}, 30);

console.log('Server is working');
