import React from "react";
import { Text } from "./text";
import { globalStyles } from "../global-styles";

interface PageCountProps {
  showTotalPages?: boolean;
}

export function PageCount({ showTotalPages = true }: PageCountProps) {
  return (
    <Text 
      render={({ pageNumber, totalPages }) => [pageNumber, showTotalPages ? totalPages : ''].join(' / ')} 
      fixed 
      style={[globalStyles.pageCount]} 
    />
  );
}