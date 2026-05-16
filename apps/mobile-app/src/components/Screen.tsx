import { ScrollView, View } from "react-native";
import type { ReactNode } from "react";
import { colors, spacing } from "../theme/design";

type ScreenProps = {
  children: ReactNode;
};

export function Screen({ children }: ScreenProps) {
  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <ScrollView contentContainerStyle={{ flexGrow: 1, padding: spacing.lg, paddingBottom: 34 }}>
        {children}
      </ScrollView>
    </View>
  );
}
