const WebSocket = require('ws');
const WebSocketServer = WebSocket.Server;
const wss = new WebSocketServer({ port: 8181 });

const uuid = require('node-uuid');

let clients = [];

const sendMsg = (type, client_uuid, nickname, msg) => {
  clients.forEach(c => {
    const clientSocket = c.ws;
    if (clientSocket.readyState === WebSocket.OPEN) {
      console.log(`client [${c.id}]: ${msg}`);
      clientSocket.send(JSON.stringify({
        type,
        id: client_uuid,
        message: msg,
        key: uuid.v1(),
        nickname
      }));
    }
  });
};

let clientIndex = 1;
wss.on("connection", ws => {
  const client_uuid = uuid.v4();
  let nickname = `AnonymousUser${clientIndex}`;
  clientIndex += 1;
  clients.push({ id: client_uuid, ws, nickname });
  console.log(`client ${client_uuid} connected`);

  var connectMsg = nickname + " has connected";
  sendMsg("notification", client_uuid, nickname, connectMsg);

  const updtNickname = () => {
    const client = clients.find(c => c.id === client_uuid);
    client.nickname = nickname;
  };

  ws.on("message", msg => {
    if(msg.indexOf("/nick") === 0) {
      const nicknameArray = msg.split(" ");
      if(nicknameArray.length >= 2) {
        const oldNickname = nickname;
        nickname = nicknameArray[1];
        updtNickname();
        const nicknameMsg = `Client ${oldNickname} changed to ${nickname}`;
        sendMsg("nick_update", client_uuid, nickname, nicknameMsg);
      }
    } else {
      sendMsg("message", client_uuid, nickname, msg);
    }
  });

  const closeSocket = customMsg => {
    console.log(`client ${client_uuid}`);
    clients = clients.filter(c => c !== client_uuid);
    disconnectMsg = customMsg ? customMsg : `${nickname} has disconnected`;
    sendMsg("notification", client_uuid, nickname, disconnectMsg);
  };

  ws.on("close", () => closeSocket());

  process.on("SIGINT", () => {
    console.log("Closing things");
    closeSocket("Server has disconnected");
    process.exit();
  });
});

