import { createApp } from "vue";
import App from "./App.vue";
import Paginate from "vuejs-paginate-next";

import "./assets/main.css";

const app = createApp(App);

app.component("Paginate", Paginate);
app.mount("#app");
