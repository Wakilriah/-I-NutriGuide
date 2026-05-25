import { ScrollView, View, type ViewStyle } from "react-native";
import type { ReactNode } from "react";
import { colors, spacing } from "../theme/design";

type ScreenProps = {
  children: ReactNode;
  contentStyle?: ViewStyle;
  topBar?: ReactNode;
};

export function Screen({ children, contentStyle, topBar }: ScreenProps) {
  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      {topBar}
      <ScrollView
        contentContainerStyle={[
          {
            flexGrow: 1,
            paddingHorizontal: spacing.md,
            paddingTop: topBar ? spacing.md : spacing.xl,
            paddingBottom: 92,
          },
          contentStyle,
        ]}
        showsVerticalScrollIndicator={false}
      >
        {children}
      </ScrollView>
    </View>
  );
}
