import { ScrollView, View } from "react-native";
import type { ReactNode } from "react";
import { colors, spacing } from "../theme/design";

type ScreenProps = {
  children: ReactNode;
  topBar?: ReactNode;
};

export function Screen({ children, topBar }: ScreenProps) {
  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      {topBar}
      <ScrollView contentContainerStyle={{ flexGrow: 1, paddingHorizontal: spacing.lg, paddingTop: topBar ? spacing.lg : spacing.xl, paddingBottom: 96 }}>
        {children}
      </ScrollView>
    </View>
  );
}
