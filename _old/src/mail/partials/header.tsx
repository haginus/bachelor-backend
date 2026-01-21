import * as React from "react";
import { Heading, Img } from "@react-email/components";
import { styles } from "../styles";

interface HeaderProps {
  heading?: string;
}

export function Header({ heading }: HeaderProps) {
  return (
    <>
      <Img
        src="https://fmi.unibuc.ro/wp-content/uploads/2020/05/sigla-fmi-1.png"
        width="260"
        height="64"
        alt="FMI"
        style={styles.logo}
      />
      { heading && <Heading style={styles.heading}>{heading}</Heading> }
    </>
  );
}
