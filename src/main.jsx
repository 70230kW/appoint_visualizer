import dayjs from "dayjs";
import "dayjs/locale/ja";
dayjs.locale("ja");
import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import "./style.css";
createRoot(document.getElementById("root")).render(<App />);
