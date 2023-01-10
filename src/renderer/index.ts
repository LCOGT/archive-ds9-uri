import ReactDOM from "react-dom/client";
import React from "react";
import { enablePatches, enableMapSet } from "immer";

import { App } from "./App";
import "./index.css";

// enable immer features
enablePatches();
enableMapSet();

const root = ReactDOM.createRoot(document.getElementById("app"));
root.render(React.createElement(App));
