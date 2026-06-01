import type { ReactNode } from "react";
import { Platform, View, type ViewStyle } from "react-native";
import { colors } from "../theme/design";

export const MOBILE_APP_MAX_WIDTH = 480;

export function MobileAppShell({
  children,
  innerStyle,
  outerStyle,
}: {
  children: ReactNode;
  innerStyle?: ViewStyle;
  outerStyle?: ViewStyle;
}) {
  return (
    <View style={[{ flex: 1, alignItems: "center", backgroundColor: colors.background }, outerStyle]}>
      <View
        style={[
          {
            width: "100%",
            maxWidth: Platform.OS === "web" ? MOBILE_APP_MAX_WIDTH : undefined,
            flex: 1,
            backgroundColor: colors.background,
          },
          innerStyle,
        ]}
      >
        {children}
      </View>
    </View>
  );
}
