module.exports = ({ strapi }) => ({
  async trigger(ctx) {
    try {
      // Environment-based secret to allow secure external triggers
      // Set GO_LIVE_SECRET and GO_LIVE_WEBHOOK_URL in your environment (e.g. Heroku config vars)
      const GO_LIVE_SECRET = process.env.GO_LIVE_SECRET;
      const GO_LIVE_WEBHOOK_URL = process.env.GO_LIVE_WEBHOOK_URL;

      const providedSecret =
        ctx.request.header["x-go-live-secret"] ||
        ctx.request.header["go-live-secret"];

      // Logging for debugging auth/trigger flow - avoid printing secret values
      strapi.log.info(
        `[go-live] Trigger request received: ip=${ctx.ip || ctx.request.ip || "unknown"}, user=${ctx.state.user ? ctx.state.user.username : "none"}, secretProvided=${!!providedSecret}`
      );
      strapi.log.debug(
        `[go-live] Env flags: GO_LIVE_SECRET=${!!GO_LIVE_SECRET}, GO_LIVE_WEBHOOK_URL=${!!GO_LIVE_WEBHOOK_URL}`
      );

      let webhookUrl = null;
      let webhookName = null;

      // If an authenticated admin user is present, use the configured webhook stored in Strapi
      if (ctx.state.user) {
        const webhooks = await strapi.db.query("webhook").findMany();

        const vercelWebhook = webhooks.find(
          (webhook) =>
            webhook.isEnabled &&
            (webhook.name.toLowerCase().includes("vercel") ||
              webhook.name.toLowerCase().includes("production") ||
              webhook.name.toLowerCase().includes("go live"))
        );

        if (!vercelWebhook) {
          strapi.log.warn(
            `[go-live] No enabled Vercel webhook found for admin user ${ctx.state.user?.username || "unknown"}`
          );
          ctx.status = 404;
          return {
            success: false,
            message: "Vercel webhook not found or not enabled",
          };
        }

        webhookUrl = vercelWebhook.url;
        webhookName = vercelWebhook.name;
        strapi.log.info(
          `[go-live] Using stored webhook: name=${webhookName}, url=${webhookUrl}, user=${ctx.state.user?.username || "unknown"}`
        );
      } else if (
        GO_LIVE_SECRET &&
        providedSecret &&
        providedSecret === GO_LIVE_SECRET
      ) {
        // Allow external callers if they provide the correct secret and an env webhook URL is configured
        if (!GO_LIVE_WEBHOOK_URL) {
          strapi.log.warn(
            `[go-live] GO_LIVE_WEBHOOK_URL missing for secret-based trigger (request from ${ctx.ip || "unknown"})`
          );
          ctx.status = 500;
          return {
            success: false,
            message:
              "GO_LIVE_WEBHOOK_URL is not configured for secret-based triggers",
          };
        }

        webhookUrl = GO_LIVE_WEBHOOK_URL;
        webhookName = "env:GO_LIVE_WEBHOOK_URL";
        strapi.log.info(
          `[go-live] Using env webhook for secret-based trigger (ip=${ctx.ip || "unknown"})`
        );
      } else {
        // No auth provided
        strapi.log.warn(
          `[go-live] Unauthorized trigger attempt: ip=${ctx.ip || "unknown"}, secretProvided=${!!providedSecret}`
        );
        ctx.status = 401;
        return {
          success: false,
          message: "Missing or invalid credentials",
        };
      }

      // Prepare webhook payload
      const triggeredBy =
        ctx.state.user?.username ||
        ctx.request.header["x-go-live-by"] ||
        "external";

      const payload = {
        event: "go-live.triggered",
        createdAt: new Date().toISOString(),
        model: "go-live",
        entry: {
          triggeredBy,
          triggeredAt: new Date().toISOString(),
        },
      };

      // Send webhook request
      const headers = { "Content-Type": "application/json" };

      // If we used the stored webhook, it may include custom headers
      if (ctx.state.user) {
        // fetch the stored webhook object again to access any headers
        const webhooks = await strapi.db.query("webhook").findMany();
        const vercelWebhook = webhooks.find(
          (webhook) => webhook.url === webhookUrl
        );
        if (vercelWebhook && vercelWebhook.headers) {
          Object.assign(headers, vercelWebhook.headers);
        }
      }

      const response = await fetch(webhookUrl, {
        method: "POST",
        headers,
        body: JSON.stringify(payload),
      });

      const responseData = await response.text();

      // Summary log for webhook response (length only, not content)
      strapi.log.info(
        `[go-live] Webhook response: url=${webhookUrl}, status=${response.status}, ok=${response.ok}, dataLength=${responseData?.length || 0}`
      );

      // Log the trigger
      await strapi.entityService.create(
        "api::go-live-trigger.go-live-trigger",
        {
          data: {
            triggeredAt: new Date(),
            triggeredBy,
            status: response.ok ? "success" : "failed",
            webhookResponse: {
              status: response.status,
              statusText: response.statusText,
              data: responseData,
            },
          },
        }
      );

      if (!response.ok) {
        ctx.status = 500;
        return {
          success: false,
          message: "Webhook request failed",
          error: responseData,
        };
      }

      return {
        success: true,
        message: "Go Live webhook triggered successfully",
        webhookName,
        response: responseData,
      };
    } catch (error) {
      strapi.log.error("Error triggering go-live webhook:", error);
      ctx.status = 500;
      return {
        success: false,
        message: "Error triggering webhook",
        error: error.message,
      };
    }
  },
});
