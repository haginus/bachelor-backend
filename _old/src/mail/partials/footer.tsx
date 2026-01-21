import * as React from "react";
import { styles } from "../styles";
import { Hr, Text } from "@react-email/components";

export function Footer() {
  return (
    <>
      <Hr style={styles.hr} />
      <Text style={{ ...styles.paragraph, ...styles.muted }}>
        <b>Facultatea de Matematică și Informatică</b>{'\n'}
        Universitatea din București
      </Text>
    </>
  );
}
