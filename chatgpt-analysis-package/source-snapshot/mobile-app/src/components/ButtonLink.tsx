import { Link, type Href } from "expo-router";
import { Text } from "react-native";
import { colors, radii, spacing } from "../theme/design";

type ButtonLinkProps = {
  href: Href;
  label: string;
};

export function ButtonLink({ href, label }: ButtonLinkProps) {
  return (
    <Link
      href={href}
      style={{
        minHeight: 58,
        overflow: "hidden",
        borderRadius: radii.lg,
        backgroundColor: colors.primary,
        paddingHorizontal: spacing.lg,
        paddingVertical: spacing.md,
        textAlign: "center",
      }}
    >
      <Text style={{ color: colors.surface, fontWeight: "900" }}>{label}</Text>
    </Link>
  );
}
