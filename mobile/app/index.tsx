import { Redirect } from "expo-router";
import { useAuth } from "../lib/auth";
export default function Index() {
  const { user, business } = useAuth();
  return (
    <Redirect href={!user ? "/auth" : !business ? "/onboarding" : "/(tabs)"} />
  );
}
