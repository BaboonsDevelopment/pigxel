import { videoEmbedUrl, type Tutorial } from "../tutorials";
import { VideoEmbed } from "./video-embed";

export function TutorialVideo({ tutorial }: { tutorial: Tutorial }) {
  if (!tutorial.youtubeId) return null;
  return (
    <VideoEmbed
      src={videoEmbedUrl(tutorial.youtubeId)}
      title={`${tutorial.title} video`}
    />
  );
}
