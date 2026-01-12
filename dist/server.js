"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const http_1 = __importDefault(require("http"));
const path_1 = __importDefault(require("path"));
const cors_1 = __importDefault(require("cors"));
const socket_io_1 = require("socket.io");
const chatRoutes_1 = __importDefault(require("./routes/chatRoutes"));
const socketService_1 = require("./services/socketService");
const PORT = Number(process.env.PORT) || 3000;
const app = (0, express_1.default)();
app.use((0, cors_1.default)());
app.use(express_1.default.json());
const publicDir = path_1.default.resolve(process.cwd(), "public");
app.use(express_1.default.static(publicDir));
app.use(chatRoutes_1.default);
app.get("/health", (_req, res) => {
    res.json({ status: "ok" });
});
const server = http_1.default.createServer(app);
const io = new socket_io_1.Server(server, {
    cors: {
        origin: "*",
    },
});
const socketService = new socketService_1.SocketService(io);
socketService.init();
server.listen(PORT, () => {
    console.log(`Idea Space is running on http://localhost:${PORT}`);
});
//# sourceMappingURL=server.js.map