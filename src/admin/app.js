import React from "react";
import GoLivePage from "./extensions/pages/GoLivePage";

const config = {
  locales: [],
  translations: {},
  tutorials: false,
  notifications: { releases: false },
};

const bootstrap = (app) => {
  // Register a custom page for Go Live functionality
  app.addMenuLink({
    to: "/go-live",
    icon: () => "🚀",
    intlLabel: {
      id: "go-live.menu.title",
      defaultMessage: "Go Live",
    },
    Component: async () => {
      return GoLivePage;
    },
  });
};

export default {
  config,
  bootstrap,
};
