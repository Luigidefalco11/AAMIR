import { createClient } from "next-sanity";
import { apiVersion, dataset, projectId } from "./env";

// Server-only client for writes (orders, marking pieces sold). Only import
// this from Route Handlers or scripts — never from a Client Component, since
// the token must not reach the browser.
export const writeClient = createClient({
  projectId,
  dataset,
  apiVersion,
  token: process.env.SANITY_WRITE_TOKEN,
  useCdn: false,
});
