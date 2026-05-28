import { Redirect } from "expo-router";

/** OAuth / SSO return path — Clerk completes the session in the browser flow before landing here. */
export default function SSOCallbackScreen() {
  return <Redirect href="/" />;
}
