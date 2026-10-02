import { defineConfig, loadEnv } from "vite";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import { nitro } from "nitro/vite";
import path from "node:path";
import fs from "node:fs";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function getDynamicEnv(): Record<string, string> {
  try {
    const envPath = path.resolve(__dirname, ".env");
    if (!fs.existsSync(envPath)) return {};
    const content = fs.readFileSync(envPath, "utf-8");
    const parsed: Record<string, string> = {};
    for (const line of content.split("\n")) {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith("#") && trimmed.includes("=")) {
        const idx = trimmed.indexOf("=");
        const key = trimmed.slice(0, idx).trim();
        let val = trimmed.slice(idx + 1).trim();
        if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
          val = val.slice(1, -1);
        }
        parsed[key] = val;
      }
    }
    return parsed;
  } catch {
    return {};
  }
}

function emailServerPlugin() {
  return {
    name: "email-server-plugin",
    configureServer(server: any) {
      server.middlewares.use(async (req: any, res: any, next: any) => {
        if (req.url === "/api/send-ticket-email" && req.method === "POST") {
          let body = "";
          req.on("data", (chunk: any) => {
            body += chunk;
          });
          req.on("end", async () => {
            try {
              const payload = JSON.parse(body || "{}");
              const { recipientEmail, subject, htmlBody } = payload;

              if (!recipientEmail || !htmlBody) {
                res.statusCode = 400;
                res.setHeader("Content-Type", "application/json");
                res.end(JSON.stringify({ success: false, message: "Missing recipientEmail or htmlBody" }));
                return;
              }

              // Read fresh SMTP / Resend configuration from .env
              const env = getDynamicEnv();
              const host = env["SMTP_HOST"] || process.env["SMTP_HOST"] || "smtp.gmail.com";
              const port = Number(env["SMTP_PORT"] || process.env["SMTP_PORT"] || 587);
              const user = (env["SMTP_USER"] || process.env["SMTP_USER"] || "ecomove.teams@gmail.com").trim();
              const rawPass = (env["SMTP_PASS"] || process.env["SMTP_PASS"] || "abmwrmjjlknmwuai").trim();
              const pass = rawPass.replace(/\s+/g, ""); // strip any spaces in app password
              const from =
                env["SMTP_FROM"] ||
                process.env["SMTP_FROM"] ||
                `"Eco-Move Nagpur" <${user}>`;
              const resendKey = env["RESEND_API_KEY"] || process.env["RESEND_API_KEY"];

              console.log(`[EmailServer] Dispatching ticket pass email to: ${recipientEmail} (from: ${user})`);

              // 1. Send via Resend REST API if key is present
              if (resendKey) {
                const resendRes = await fetch("https://api.resend.com/emails", {
                  method: "POST",
                  headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${resendKey}`,
                  },
                  body: JSON.stringify({
                    from: from.includes("@") ? from : "Eco-Move <onboarding@resend.dev>",
                    to: [recipientEmail],
                    subject,
                    html: htmlBody,
                  }),
                });
                const resendData = await resendRes.json();
                console.log(`[EmailServer] Dispatched via Resend:`, resendData);
                res.setHeader("Content-Type", "application/json");
                res.end(JSON.stringify({ success: true, provider: "resend", data: resendData }));
                return;
              }

              // 2. Send via Nodemailer (Gmail / Custom SMTP)
              if ((host || user.includes("gmail")) && user && pass) {
                const nodemailer = await import("nodemailer");

                let transporter;
                if (host?.includes("gmail") || user.includes("gmail.com")) {
                  transporter = nodemailer.createTransport({
                    service: "gmail",
                    auth: { user, pass },
                  });
                } else {
                  transporter = nodemailer.createTransport({
                    host,
                    port,
                    secure: port === 465,
                    auth: { user, pass },
                  });
                }

                const { qrCodeDataUrl, ticketId } = payload;
                const qrBase64Clean = qrCodeDataUrl ? qrCodeDataUrl.replace(/^data:image\/\w+;base64,/, "") : null;
                const attachments = qrBase64Clean
                  ? [
                      {
                        filename: `qrcode-${ticketId || "pass"}.png`,
                        content: Buffer.from(qrBase64Clean, "base64"),
                        cid: "ticketqr",
                      },
                    ]
                  : [];

                const info = await transporter.sendMail({
                  from,
                  to: recipientEmail,
                  subject,
                  html: htmlBody,
                  attachments,
                });

                console.log(`[EmailServer] Successfully delivered email to ${recipientEmail}! Message ID: ${info.messageId}`);
                res.setHeader("Content-Type", "application/json");
                res.end(
                  JSON.stringify({
                    success: true,
                    provider: "nodemailer",
                    messageId: info.messageId,
                  })
                );
                return;
              }

              // 3. Fallback: Missing credentials warning
              console.warn("[EmailServer] No SMTP credentials configured.");
              res.setHeader("Content-Type", "application/json");
              res.end(
                JSON.stringify({
                  success: false,
                  requiresConfig: true,
                  message: "SMTP credentials not found or incomplete in .env.",
                })
              );
            } catch (err: any) {
              console.error("[EmailServer] Error sending email:", err);
              res.statusCode = 500;
              res.setHeader("Content-Type", "application/json");
              res.end(JSON.stringify({ success: false, error: err.message }));
            }
          });
        } else {
          next();
        }
      });
    },
  };
}

export default defineConfig(({ command, mode }) => {
  const env = loadEnv(mode, process.cwd(), "");

  return {
    resolve: {
      tsconfigPaths: true,
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
      dedupe: [
        "react",
        "react-dom",
        "react/jsx-runtime",
        "react/jsx-dev-runtime",
        "@tanstack/react-query",
        "@tanstack/query-core",
      ],
    },
    css: {
      transformer: "lightningcss",
    },
    plugins: [
      emailServerPlugin(),
      tailwindcss(),
      tanstackStart({
        server: { entry: "server" },
      }),
      react(),
      ...(command === "build"
        ? [
            nitro({
              defaultPreset: "cloudflare-module",
              output: {
                dir: "dist",
                serverDir: "dist/server",
                publicDir: "dist/client",
              },
              cloudflare: {
                nodeCompat: true,
                deployConfig: true,
              },
            }),
          ]
        : []),
    ],
    server: {
      host: "::",
      port: 8080,
    },
  };
});
