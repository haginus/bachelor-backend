import React from "react";
import { Text, View } from "@react-pdf/renderer";
import { globalStyles } from "../global-styles";
import { Checkboxes } from "./checkboxes";
import { Student } from "../../models/models";

interface FormHeaderProps {
  student: Student;
  showIdentificationCode?: boolean;
  showMG?: boolean;
}

export function FormHeader({ student, showIdentificationCode, showMG }: FormHeaderProps) {
  return (
    <View style={[globalStyles.header, globalStyles.section]}>
      <View style={globalStyles.sectionColumn}>
        <Text>UNIVERSITATEA DIN BUCUREȘTI</Text>
        <Text>Facultatea de Matematică și Informatică</Text>
        <Text>Domeniul: {student.domain.name}</Text>
        <Text>Programul de studii: {student.specialization.name}</Text>
        <Text>Promoția: {student.promotion}</Text>
      </View>
      <View
        style={[
          globalStyles.sectionColumn,
          { flexDirection: "column", alignItems: "flex-end" },
        ]}
      >
        <Checkboxes
          label="Forma de finanțare"
          value={student.fundingForm}
          options={[
            { label: "Buget", value: "budget" },
            { label: "Taxă", value: "tax" },
          ]}
        />
        <Checkboxes
          label="Forma de învățământ"
          value={student.studyForm}
          options={[
            { label: "IF", value: "if" },
            { label: "IFR", value: "ifr" },
            { label: "ID", value: "id" },
          ]}
        />
        {showIdentificationCode && (
          <Text>
            {"\n"}
            Număr matricol: {student.identificationCode}
            {"    "}
            Grupa: {student.group}
          </Text>
        )}
        {showMG && (
          <Text>
            {"\n"}
            M.G.{" "}
            {student.generalAverage
              ? student.generalAverage.toFixed(2)
              : "........."}
          </Text>
        )}
      </View>
    </View>
  );
}
