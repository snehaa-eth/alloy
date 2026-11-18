// Vercel serverless entrypoint. vercel.json rewrites every path here.
// An Express app is a (req, res) handler, so it is exported directly.
import { createApp } from "../src/app";

export default createApp();
