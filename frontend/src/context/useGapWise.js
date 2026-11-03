import { useContext } from "react";
import GapWiseContext from "./GapWiseContext";

export function useGapWise() {
  const context = useContext(GapWiseContext);

  if (!context) {
    throw new Error(
      "useGapWise must be used inside GapWiseProvider"
    );
  }

  return context;
}