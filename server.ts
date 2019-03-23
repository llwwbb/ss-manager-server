import express from 'express';
import http from 'http';
import bodyParser from 'body-parser';
import cors from 'cors';
import dgram from 'dgram';
import config from './config';
import { fromEvent } from 'rxjs';
import { take, timeout, map } from 'rxjs/operators';
let app = express();
let server = http.createServer(app);

app.use(bodyParser.json());
app.use(cors());

let socket = dgram.createSocket('udp4');
socket.bind(5555);

const messageOb = fromEvent<string>(socket, 'message').pipe(map(bufferArray => String(bufferArray[0])));
const errorOb = fromEvent<Error>(socket, 'error').subscribe(console.log);

function sendUDP(message: string) {
    let o = messageOb.pipe(take(1), timeout(1500));

    socket.send(message, 0, message.length, 8839, 'localhost');
    return o;
}

function doit(msg: string, res: express.Response) {
    sendUDP(msg).subscribe(value => {
        res.send(value);
    }, error => {
        res.sendStatus(500);
    })
}

app.use('*', (req, res, next) => {
    if (req.headers.token !== config.token) {
        return res.sendStatus(401);
    }
    next();
})

app.get('/ss', async (req, res) => {
    let msg = 'list';
    doit(msg, res);
});

interface addBody {
    server_port: number,
    password: string,
    fast_open: boolean,
    no_delay: boolean,
    mode: string,
    method: string,
    plugin: string,
    plugin_opts: string,
}

app.put('/ss', async (req, res) => {
    let body = <addBody>req.body;
    let msg = 'add: ' + JSON.stringify(body);
    doit(msg, res);
});

app.delete('/ss/:port', async (req, res) => {
    let msg = 'remove: ' + JSON.stringify({ server_port: req.params.port });
    doit(msg, res);
})

app.get('/ping', async (req, res) => {
    let msg = 'ping';
    doit(msg, res);
})

server.listen(config.listenPort);