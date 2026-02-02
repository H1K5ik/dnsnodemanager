// DnsNodeManager
// Frontend

import React from "react";
import ReactDOM from "react-dom";
import { LanguageProvider } from "./common/LanguageContext";
import App from "./App";
import "@fontsource/roboto";
// import * as serviceWorker from './_serviceWorker';

ReactDOM.render(
  <LanguageProvider>
    <App />
  </LanguageProvider>,
  document.getElementById("root")
);

// serviceWorker.unregister();
