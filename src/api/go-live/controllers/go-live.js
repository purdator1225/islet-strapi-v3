module.exports = ({ strapi }) => ({
  async trigger(ctx) {
    try {
      // Get the webhook configuration
      const webhooks = await strapi.db.query("webhook").findMany();

      // Find the Vercel webhook (you can adjust the filter based on your webhook name)
      const vercelWebhook = webhooks.find(
        (webhook) =>
          webhook.isEnabled &&
          (webhook.name.toLowerCase().includes("vercel") ||
            webhook.name.toLowerCase().includes("deploy") ||
            webhook.name.toLowerCase().includes("go live"))
      );

      if (!vercelWebhook) {
        ctx.status = 404;
        return {
          success: false,
          message: "Vercel webhook not found or not enabled",
        };
      }

      // Trigger the webhook
      const webhookService = strapi.service("webhook");

      // Prepare webhook payload
      const payload = {
        event: "go-live.triggered",
        createdAt: new Date().toISOString(),
        model: "go-live",
        entry: {
          triggeredBy: ctx.state.user?.username || "system",
          triggeredAt: new Date().toISOString(),
        },
      };

      // Send webhook request
      const response = await fetch(vercelWebhook.url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(vercelWebhook.headers || {}),
        },
        body: JSON.stringify(payload),
      });

      const responseData = await response.text();

      // Log the trigger
      await strapi.entityService.create(
        "api::go-live-trigger.go-live-trigger",
        {
          data: {
            triggeredAt: new Date(),
            triggeredBy: ctx.state.user?.username || "system",
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
        webhookName: vercelWebhook.name,
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
