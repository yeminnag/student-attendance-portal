import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import handler from "./api/send-morning-notifications.js";

function morningNotificationsApiPlugin() {
    return {
        name: "morning-notifications-api",
        configureServer(server) {
            server.middlewares.use(async (req, res, next) => {
                const url = req.url?.split("?")[0];
                if (url !== "/api/send-morning-notifications") {
                    return next();
                }

                const env = loadEnv(server.config.mode, process.cwd(), "");
                const cronSecret = env.CRON_SECRET ?? "";

                const mockReq = {
                    method: req.method ?? "GET",
                    headers: {
                        authorization: cronSecret ? `Bearer ${cronSecret}` : "",
                    },
                };

                const mockRes = {
                    statusCode: 200,
                    status(code) {
                        this.statusCode = code;
                        return this;
                    },
                    json(body) {
                        res.statusCode = this.statusCode;
                        res.setHeader("Content-Type", "application/json");
                        res.end(JSON.stringify(body));
                    },
                };

                try {
                    await handler(mockReq, mockRes);
                } catch (error) {
                    res.statusCode = 500;
                    res.setHeader("Content-Type", "application/json");
                    res.end(JSON.stringify({ error: error.message ?? "Internal server error" }));
                }
            });
        },
    };
}

export default defineConfig({
    plugins: [react(), morningNotificationsApiPlugin()],
    resolve: {
        alias: { "@": "/src" },
    },
    server: {
        port: 3000,
    },
});
