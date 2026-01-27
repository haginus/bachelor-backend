import React from "react";
import { Text as _Text } from "@react-pdf/renderer";

const hyphenationCallback = (word: string) => [word];

export function Text(props: React.ComponentProps<typeof _Text>) {
  return (
    <_Text {...props} hyphenationCallback={props.hyphenationCallback || hyphenationCallback} />
  );
}