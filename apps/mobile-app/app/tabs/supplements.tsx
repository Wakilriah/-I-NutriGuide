"use client";

import { Ionicons } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import { router } from "expo-router";
import { 
  View, 
  Text, 
  Card, 
  Button, 
  Colors, 
  TouchableOpacity,
  Badge as UIBadge
} from "react-native-ui-lib";
import { ScrollView } from "react-native";
import { Screen } from "../../src/components/Screen";
import { AppTopBar, EmptyState, ErrorState, LoadingState, PageHeader, AnimatedSection } from "../../src/components/ui";
import { listUserSupplements } from "../../src/features/supplements/api";
import { spacing } from "../../src/theme/design";

export default function SupplementsScreen() {
  const { data, isError, isLoading } = useQuery({
    queryKey: ["user-supplements"],
    queryFn: listUserSupplements,
  });

  return (
    <Screen topBar={<AppTopBar />}>
      <ScrollView contentContainerStyle={{ paddingBottom: spacing.xl }}>
        <AnimatedSection>
          <PageHeader eyebrow="Your routine" title="Cabinet" subtitle="Track your supplement intake and check interaction safety." />
        </AnimatedSection>

        <View padding-24>
          <Button 
            label="Add Supplement" 
            iconSource={() => <Ionicons name="add-circle" size={20} color="white" style={{ marginRight: 8 }} />}
            onPress={() => router.push("/supplements/new" as never)} 
            size={Button.sizes.large}
          />
        </View>

        {isLoading && <View padding-24><LoadingState message="Opening cabinet..." /></View>}
        {isError && <View padding-24><ErrorState message="Unable to load cabinet." /></View>}
        {!isLoading && !isError && data?.length === 0 && (
          <View padding-24>
            <EmptyState icon="medical" title="Cabinet is empty" message="Add your first supplement to get personalized food pairings." />
          </View>
        )}

        <View paddingH-24 gap-16>
          {data?.map((item) => (
            <TouchableOpacity 
              key={item.id} 
              onPress={() => router.push(`/supplements/${item.id}` as never)}
            >
              <Card padding-24 row centerV spread>
                <View flex>
                  <View row centerV marginB-4>
                    <Text h3>{item.supplement.name}</Text>
                    {!item.active && <UIBadge label="Inactive" backgroundColor={Colors.muted} style={{ marginLeft: 8 }} />}
                  </View>
                  <Text body color={Colors.muted}>{item.dose} - {item.frequency}</Text>
                  <View row centerV marginT-8>
                    <Ionicons name="time-outline" size={14} color={Colors.primary} style={{ marginRight: 4 }} />
                    <Text small primary bold>{item.time_of_day}</Text>
                  </View>
                </View>
                <Ionicons name="chevron-forward" size={20} color={Colors.background} />
              </Card>
            </TouchableOpacity>
          ))}
        </View>

        <View padding-24 marginT-12>
          <Card padding-24 backgroundColor={Colors.background} style={{ borderWidth: 0 }}>
             <View row centerV marginB-8>
                <Ionicons name="sparkles" size={20} color={Colors.primary} style={{ marginRight: 8 }} />
                <Text bold primary>Personalized Insights</Text>
             </View>
             <Text body>Based on your routine, I-NutriGuide highlights supplement timing and food pairings that improve absorption.</Text>
          </Card>
        </View>

      </ScrollView>
    </Screen>
  );
}
