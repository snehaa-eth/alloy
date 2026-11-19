import { Composition, Folder } from "remotion";
import { Film } from "./Film";

// 50.0 s at 30 fps = 1500 frames. Music variant is a prop, so every version shares one edit.
export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Folder name="Priya">
        <Composition id="Priya9x16" component={Film} durationInFrames={1500} fps={30} width={1080} height={1920} defaultProps={{ music: "electronica" as const, sound: true }} />
        <Composition id="Priya1x1" component={Film} durationInFrames={1500} fps={30} width={1080} height={1080} defaultProps={{ music: "electronica" as const, sound: true }} />
      </Folder>
    </>
  );
};
