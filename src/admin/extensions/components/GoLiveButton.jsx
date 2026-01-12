import React, { useState } from "react";
import { Button } from "@strapi/design-system";
import { Play } from "@strapi/icons";
import { useFetchClient, useNotification } from "@strapi/strapi/admin";

const GoLiveButton = () => {
  const [isLoading, setIsLoading] = useState(false);
  const { post } = useFetchClient();
  const toggleNotification = useNotification();

  const handleGoLive = async () => {
    try {
      setIsLoading(true);

      const response = await post("/api/go-live/trigger");

      if (response.data.success) {
        toggleNotification({
          type: "success",
          message: "Go Live webhook triggered successfully!",
        });
      } else {
        throw new Error("Failed to trigger webhook");
      }
    } catch (error) {
      console.error("Error triggering go-live webhook:", error);
      toggleNotification({
        type: "danger",
        message: error.message || "Failed to trigger Go Live webhook",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Button
      onClick={handleGoLive}
      loading={isLoading}
      startIcon={<Play />}
      variant="success"
      size="L"
    >
      Go Live
    </Button>
  );
};

export default GoLiveButton;
