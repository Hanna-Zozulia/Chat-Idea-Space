import express, {Application} from "express";
import http from "http";
import path from "path";
import cors from "cors";
import { Server as SocketIOServer} from "socket.io";
import chatRoutes from "./routes/chatRoutes";
import { SocketService } from "./services/socketService";

const PORT = Number(process.env.PORT) || 3000;
const app: Application = express();

app.use(cors());
app.use(express.json());

const publicDir = path.resolve(process.cwd(), "public");
app.use(express.static(publicDir));
app.use(chatRoutes);

app.get("/health", (_req, res) => {
    res.json({ status: "ok" });
});

const server = http.createServer(app);
const io = new SocketIOServer(server, {
    cors: {
        origin: "*",
    },
});

const socketService = new SocketService(io);
socketService.init();

server.listen(PORT, () => {
    console.log(`Idea Space is running on http://localhost:${PORT}`);
});