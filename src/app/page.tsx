import { AuthGate } from "@/components/auth/AuthGate";
import { OnboardingGate } from "@/components/onboarding/OnboardingGate";
import { RoomScreen } from "@/components/RoomScreen";

export default function HomePage() {
  return (
    <>
      <RoomScreen code="RAP01" />
      <AuthGate />
      <OnboardingGate />
    </>
  );
}
