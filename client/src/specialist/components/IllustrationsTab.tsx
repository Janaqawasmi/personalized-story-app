import IllustrationsTabV2 from "./illustration/IllustrationsTabV2";
import type { Story } from "../../types/story";

interface Props {
  story: Story;
  onStoryUpdate: (story: Story) => void;
}

export default function IllustrationsTab(props: Props) {
  return <IllustrationsTabV2 story={props.story} />;
}
