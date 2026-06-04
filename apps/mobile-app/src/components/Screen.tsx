import { ScrollView, type ViewStyle } from "react-native";
import type { ReactNode } from "react";
import { colors, spacing } from "../theme/design";
import { AiAssistantFab } from "./ui";
import { SafeAreaView } from "react-native-safe-area-context";
import { MobileAppShell } from "./MobileAppShell";

type ScreenProps = {
  children: ReactNode;
  contentStyle?: ViewStyle;
  topBar?: ReactNode;
  showAiAssistant?: boolean;
};

export function Screen({ children, contentStyle, showAiAssistant = false, topBar }: ScreenProps) {
  return (
    <SafeAreaView edges={["left", "right"]} style={{ flex: 1, backgroundColor: colors.background }}>
      <MobileAppShell>
        {topBar}
        <ScrollView
          contentContainerStyle={[
            {
              flexGrow: 1,
              paddingHorizontal: spacing.lg,
              paddingTop: topBar ? spacing.lg : spacing.xl,
              paddingBottom: 122,
            },
            contentStyle,
          ]}
          showsVerticalScrollIndicator={false}
        >
          {children}
        </ScrollView>
        {showAiAssistant ? <AiAssistantFab /> : null}
      </MobileAppShell>
    </SafeAreaView>
  );
}
