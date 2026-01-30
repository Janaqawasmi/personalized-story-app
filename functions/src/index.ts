import * as functions from "firebase-functions";
import app from "../../server/src/app";

export const api = functions.https.onRequest(app);

