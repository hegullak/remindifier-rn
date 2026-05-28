import { Text, type TextStyle } from "react-native";

export interface SectionLabelProps {
  children: string;
  style?: TextStyle;
}

export function SectionLabel({ children, style }: SectionLabelProps) {
  return (
    <Text
      className="text-[11px] uppercase tracking-[1.92px] text-text3 font-bodySemi mt-5 mb-2"
      style={style}
    >
      {children}
    </Text>
  );
}
