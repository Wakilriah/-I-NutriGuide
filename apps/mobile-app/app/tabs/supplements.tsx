import { useQuery } from "@tanstack/react-query";
import { router } from "expo-router";
import { TouchableOpacity, View } from "react-native";
import { Screen } from "../../src/components/Screen";
import { AppButton, EmptyState, ErrorState, LoadingState, PageHeader, SupplementCard } from "../../src/components/ui";
import { listUserSupplements } from "../../src/features/supplements/api";
import { spacing } from "../../src/theme/design";

export default function SupplementsScreen() {
  const { data, isError, isLoading } = useQuery({
    queryKey: ["user-supplements"],
    queryFn: listUserSupplements,
  });

  return (
    <Screen>
      <View style={{ gap: spacing.lg }}>
        <PageHeader eyebrow="Your routine" title="Supplements" subtitle="Track what you take so recommendations can pair foods with your routine." />

        <AppButton icon="add-circle" label="Add supplement" onPress={() => router.push("/supplements/new" as never)} />

        {isLoading ? <LoadingState message="Loading supplements..." /> : null}
        {isError ? <ErrorState message="Unable to load supplements." /> : null}
        {!isLoading && !isError && data?.length === 0 ? (
          <EmptyState icon="medical" title="No supplements added yet." message="Add your first supplement to get personalized food recommendations." />
        ) : null}

        <View style={{ gap: spacing.sm }}>
          {data?.map((item) => (
            <TouchableOpacity accessibilityLabel={`Open ${item.supplement.name}`} key={item.id} onPress={() => router.push(`/supplements/${item.id}` as never)}>
              <SupplementCard active={item.active} dose={item.dose} frequency={item.frequency} name={item.supplement.name} timeOfDay={item.time_of_day} />
            </TouchableOpacity>
          ))}
        </View>
      </View>
    </Screen>
  );
}
