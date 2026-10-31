import type { Metadata } from "next";
import { RoomScreen } from "@/components/RoomScreen";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ code: string }>;
}): Promise<Metadata> {
  const { code } = await params;
  return {
    title: `Rạp Nhà · phòng ${code.toUpperCase()}`,
  };
}

export default async function RoomPage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = await params;
  return <RoomScreen code={code.toUpperCase()} />;
}
