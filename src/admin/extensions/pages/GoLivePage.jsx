import React, { useState, useEffect } from "react";
import { Box, Button, Typography, Flex } from "@strapi/design-system";
import { Page } from "@strapi/strapi/admin";
import { Play, Check, Cross, ExternalLink } from "@strapi/icons";
import { useFetchClient, useNotification } from "@strapi/strapi/admin";

const GoLivePage = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [history, setHistory] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const { post, get } = useFetchClient();
  const toggleNotification = useNotification();

  useEffect(() => {
    loadHistory();
  }, []);

  const loadHistory = async () => {
    try {
      setLoadingHistory(true);
      const response = await get(
        "/api/go-live-triggers?sort=createdAt:desc&pagination[limit]=5"
      );
      if (response.data) {
        setHistory(response.data.data || []);
      }
    } catch (error) {
      console.error("Error loading history:", error);
    } finally {
      setLoadingHistory(false);
    }
  };

  const handleGoLive = async () => {
    try {
      setIsLoading(true);

      const response = await post("/api/go-live/trigger");

      if (response.data.success) {
        toggleNotification({
          type: "success",
          message: "Go Live webhook triggered successfully!",
        });
        // Reload history after triggering
        setTimeout(() => loadHistory(), 1000);
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
    <Page.Main>
      <Page.Title>Go Live</Page.Title>
      <Box padding={8}>
        <Flex direction="column" alignItems="stretch" gap={4}>
          <Box
            background="neutral0"
            padding={6}
            shadow="filterShadow"
            hasRadius
          >
            <Typography variant="beta" as="h2" paddingBottom={4}>
              Deploy to Production
            </Typography>
            <Box paddingBottom={4}>
              <Typography>
                Click the button below to trigger your Vercel deployment
                webhook. This will rebuild and deploy your production site with
                the latest content.
              </Typography>
            </Box>
            <Button
              onClick={handleGoLive}
              loading={isLoading}
              startIcon={<Play />}
              variant="success"
              size="L"
              fullWidth
            >
              {isLoading ? "Triggering Deployment..." : "Go Live"}
            </Button>
          </Box>

          <Box
            background="neutral0"
            padding={6}
            shadow="filterShadow"
            hasRadius
          >
            <Typography variant="beta" as="h2" paddingBottom={4}>
              Visit Staging Site
            </Typography>
            <Box paddingBottom={4}>
              <Typography>
                Preview the staging environment before deploying to production.
              </Typography>
            </Box>
            <Button
              as="a"
              href="https://staging.isletstudio.com/"
              target="_blank"
              rel="noopener noreferrer"
              startIcon={<ExternalLink />}
              variant="secondary"
              size="L"
              fullWidth
            >
              Open Staging Site
            </Button>
          </Box>

          {!loadingHistory && history.length > 0 && (
            <Box
              background="neutral0"
              padding={6}
              shadow="filterShadow"
              hasRadius
            >
              <Typography variant="beta" as="h2" paddingBottom={4}>
                Recent Deployments
              </Typography>
              <Box>
                {history.map((item) => (
                  <Box
                    key={item.id}
                    padding={3}
                    background="neutral100"
                    borderColor="neutral200"
                    hasRadius
                    marginBottom={2}
                  >
                    <Flex justifyContent="space-between" alignItems="center">
                      <Flex direction="column" gap={1}>
                        <Typography fontWeight="semiBold">
                          {item.attributes?.triggeredBy || "Unknown"}
                        </Typography>
                        <Typography variant="pi" textColor="neutral600">
                          {new Date(
                            item.attributes?.triggeredAt
                          ).toLocaleString()}
                        </Typography>
                      </Flex>
                      <Flex alignItems="center" gap={2}>
                        {item.attributes?.status === "success" ? (
                          <>
                            <Check color="success600" />
                            <Typography textColor="success600">
                              Success
                            </Typography>
                          </>
                        ) : (
                          <>
                            <Cross color="danger600" />
                            <Typography textColor="danger600">
                              Failed
                            </Typography>
                          </>
                        )}
                      </Flex>
                    </Flex>
                  </Box>
                ))}
              </Box>
            </Box>
          )}
        </Flex>
      </Box>
    </Page.Main>
  );
};

export default GoLivePage;
