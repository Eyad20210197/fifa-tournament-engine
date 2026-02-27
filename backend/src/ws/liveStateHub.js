import jwt from "jsonwebtoken";
import { WebSocketServer } from "ws";
import { env } from "../config/env.js";
import { logger } from "../utils/logger.js";

function safeParseMessage(raw) {
  try {
    const parsed = JSON.parse(String(raw || ""));
    return parsed && typeof parsed === "object" ? parsed : null;
  } catch {
    return null;
  }
}

export function setupLiveStateWebSocket(httpServer) {
  const wss = new WebSocketServer({ noServer: true });
  const clientsByBusiness = new Map();
  const debugDisableOrigin =
    String(process.env.WS_DEBUG_DISABLE_ORIGIN_CHECK || "").toLowerCase() === "true";
  const debugSkipAuth =
    String(process.env.WS_DEBUG_SKIP_AUTH || "").toLowerCase() === "true";

  function addClient(businessId, ws) {
    if (!clientsByBusiness.has(businessId)) {
      clientsByBusiness.set(businessId, new Set());
    }
    clientsByBusiness.get(businessId).add(ws);
  }

  function removeClient(businessId, ws) {
    const set = clientsByBusiness.get(businessId);
    if (!set) return;
    set.delete(ws);
    if (set.size === 0) {
      clientsByBusiness.delete(businessId);
    }
  }

  function broadcastToBusiness(businessId, payload, sender) {
    const set = clientsByBusiness.get(businessId);
    if (!set) return;

    const serialized = JSON.stringify(payload);
    for (const client of set) {
      if (client === sender) continue;
      if (client.readyState === 1) {
        client.send(serialized);
      }
    }
  }

  httpServer.on("upgrade", (request, socket, head) => {
    console.log("========== WS UPGRADE ==========");
    console.log("RAW URL:", request.url);
    console.log("HEADERS:", request.headers);
    console.log("ORIGIN:", request.headers.origin);
    console.log("ENV NODE_ENV:", env.nodeEnv);
    console.log("ENV SECRET:", env.jwtSecret);
    console.log("ENV SECRET LENGTH:", env.jwtSecret?.length ?? 0);
    console.log("ENV ALLOWED ORIGINS:", env.allowedOrigins);
    console.log("DEBUG FLAGS:", { debugDisableOrigin, debugSkipAuth });

    const url = new URL(request.url, "http://localhost");
    if (url.pathname !== "/ws/live-state") {
      socket.destroy();
      return;
    }

    const requestOrigin = String(request.headers.origin || "");
    const enforceOrigin = env.nodeEnv === "production";
    if (enforceOrigin && !debugDisableOrigin) {
      const isAllowed =
        env.allowedOrigins.includes(requestOrigin) ||
        requestOrigin.endsWith(".vercel.app");

      if (!isAllowed) {
        logger.warn(`Blocked WS origin: ${requestOrigin}`);
        socket.write("HTTP/1.1 403 Forbidden\r\n\r\n");
        socket.destroy();
        return;
      }
    }

    const token = url.searchParams.get("token");
    console.log("QUERY STRING:", url.searchParams.toString());
    console.log("TOKEN FROM QUERY:", token);
    console.log("TOKEN LENGTH:", token?.length ?? 0);
    console.log("TOKEN SEGMENTS:", token ? String(token).split(".").length : 0);
    if (token) {
      const decoded = jwt.decode(token);
      console.log("JWT DECODED (UNVERIFIED):", decoded);
    }

    if (debugSkipAuth) {
      console.log("TOKEN SKIPPED FOR TEST");
    }

    if (!debugSkipAuth && !token) {
      socket.write("HTTP/1.1 401 Unauthorized\r\n\r\n");
      socket.destroy();
      return;
    }

    let payload = null;
    if (!debugSkipAuth) {
      try {
        payload = jwt.verify(token, env.jwtSecret);
        console.log("JWT VERIFIED:", payload);
      } catch (err) {
        console.log("JWT VERIFY ERROR:", err.message);
        socket.write("HTTP/1.1 401 Unauthorized\r\n\r\n");
        socket.destroy();
        return;
      }
    } else {
      payload = { business_id: 1, sub: 0 };
    }

    const businessId = Number(payload?.business_id);
    console.log("BUSINESS ID:", businessId);
    if (!businessId) {
      socket.write("HTTP/1.1 403 Forbidden\r\n\r\n");
      socket.destroy();
      return;
    }

    wss.handleUpgrade(request, socket, head, (ws) => {
      ws.businessId = businessId;
      ws.userId = payload?.sub ? Number(payload.sub) : null;

      addClient(businessId, ws);
      ws.send(
        JSON.stringify({
          type: "WS_CONNECTED",
          businessId,
          timestamp: Date.now(),
        }),
      );

      ws.on("message", (data) => {
        const msg = safeParseMessage(data);
        if (!msg) return;
        if (msg.type !== "STATE_UPDATED") return;

        broadcastToBusiness(
          businessId,
          {
            type: "STATE_UPDATED",
            payload: msg.payload || null,
            businessId,
            timestamp: Date.now(),
          },
          ws,
        );
      });

      ws.on("close", () => {
        removeClient(businessId, ws);
      });
    });
  });

  logger.info("Live-state WebSocket enabled at /ws/live-state");
  return wss;
}
