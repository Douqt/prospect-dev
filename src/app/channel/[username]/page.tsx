import ChannelPage from "@/components/channel/ChannelPage";

interface ChannelPageProps {
  params: Promise<{
    username: string;
  }>;
}

export default async function Channel({ params }: ChannelPageProps) {
  const { username } = await params;
  return <ChannelPage username={username} />;
}
