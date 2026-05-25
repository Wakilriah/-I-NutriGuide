"use client";

import { Ionicons } from "@expo/vector-icons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { router } from "expo-router";
import { 
  View, 
  Text, 
  Card, 
  Button, 
  ProgressBar, 
  Colors, 
  TouchableOpacity
} from "react-native-ui-lib";
import { ScrollView, ImageBackground } from "react-native";
import { Screen } from "../../src/components/Screen";
import {
  AnimatedSection,
  AppTopBar,
  Badge,
  EmptyState,
} from "../../src/components/ui";
import { generateRecommendations, listRecommendationHistory } from "../../src/features/recommendations/api";
import { listUserSupplements } from "../../src/features/supplements/api";
import { getTodayTracking } from "../../src/features/tracking/api";
import { getProfile } from "../../src/features/profile/api";
import { useAuthStore } from "../../src/stores/auth-store";
import { images, spacing } from "../../src/theme/design";

export default function HomeScreen() {
  const user = useAuthStore((state) => state.user);
  const queryClient = useQueryClient();
  const supplements = useQuery({ queryKey: ["user-supplements"], queryFn: listUserSupplements });
  const history = useQuery({ queryKey: ["recommendation-history"], queryFn: listRecommendationHistory });
  const today = useQuery({ queryKey: ["tracking", "today"], queryFn: getTodayTracking });
  const profile = useQuery({ queryKey: ["profile"], queryFn: getProfile });

  const latestRun = history.data?.[0];
  const activeSupplementCount = supplements.data?.filter((item) => item.active).length ?? 0;
  
  const generateMutation = useMutation({
    mutationFn: () => generateRecommendations(10),
    onSuccess: async (run) => {
      await queryClient.invalidateQueries({ queryKey: ["recommendation-history"] });
      router.replace(`/recommendations/${run.run_id}` as never);
    },
  });

  const targets = {
    calories: profile.data?.goal === "weight_loss" ? 1800 : profile.data?.goal === "muscle" ? 2800 : 2200,
    water: 2500,
  };

  const stats = {
    calories: today.data?.calories ?? 0,
    water: today.data?.water_ml ?? 0,
    supplements: today.data?.supplements_taken.length ?? 0,
  };

  return (
    <Screen topBar={<AppTopBar onAvatarPress={() => router.push("/tabs/profile" as never)} />}>
      <ScrollView contentContainerStyle={{ paddingBottom: spacing.lg }} showsVerticalScrollIndicator={false}>
        
        {/* Modern Hero Section */}
        <AnimatedSection>
          <View br10 marginH-24 style={{ overflow: "hidden" }}>
            <ImageBackground
              source={{ uri: images.breakfast }}
              style={{ minHeight: 240, justifyContent: "flex-end" }}
            >
              <View flex bottom padding-24 backgroundColor="rgba(0,0,0,0.15)">
                <Card padding-16 backgroundColor="rgba(255,255,255,0.92)" style={{ borderWidth: 0 }}>
                  <Text primary label marginB-4>Overview</Text>
                  <Text h2>Hi {user?.name.split(' ')[0] ?? "there"}!</Text>
                  
                  <View row spread marginT-12>
                     <View flex marginR-12>
                        <Text small bold marginB-4 color={Colors.muted}>CALORIES</Text>
                        <ProgressBar 
                          progress={(stats.calories / targets.calories) * 100} 
                          progressColor={Colors.primary} 
                          style={{ height: 8 }}
                        />
                        <Text h3 marginT-4>{stats.calories} <Text body color={Colors.muted}>/ {targets.calories}</Text></Text>
                     </View>
                     <View flex>
                        <Text small bold marginB-4 color={Colors.muted}>WATER</Text>
                        <ProgressBar 
                          progress={(stats.water / targets.water) * 100} 
                          progressColor={Colors.blue} 
                          style={{ height: 8 }}
                        />
                        <Text h3 marginT-4>{stats.water} <Text body color={Colors.muted}>/ {targets.water}</Text></Text>
                     </View>
                  </View>
                </Card>
              </View>
            </ImageBackground>
          </View>
        </AnimatedSection>

        {/* Quick Actions */}
        <AnimatedSection delay={60}>
          <View row paddingH-24 marginT-24 style={{ gap: spacing.lg }}>
            <ActionTile color="success" icon="add-circle" label="Log Food" onPress={() => router.push("/tabs/tracking" as never)} />
            <ActionTile color="blue" icon="water" label="Hydration" onPress={() => router.push("/tabs/tracking" as never)} />
            <ActionTile color="orange" icon="medkit" label="Pills" onPress={() => router.push("/tabs/supplements" as never)} />
          </View>
        </AnimatedSection>

        {/* AI Guidance Card */}
        <AnimatedSection delay={120}>
          <View paddingH-24 marginT-24>
            <Card padding-24>
               <View row spread centerV marginB-12>
                  <Text h3>AI Nutritionist</Text>
                  <Badge label="Active" tone="green" />
               </View>
               
               {latestRun ? (
                 <View>
                    <Text body marginB-16>We've updated your daily goals based on yesterday's metrics.</Text>
                    <Button 
                      label="View Full Plan" 
                      iconSource={() => <Ionicons color="white" name="sparkles" size={18} style={{ marginRight: 8 }} />}
                      onPress={() => router.push(`/recommendations/${latestRun.run_id}` as never)} 
                    />
                 </View>
               ) : (
                 <EmptyState 
                   icon="sparkles-outline"
                   message="Track your intake for personalized AI advice."
                   title="No guidance yet" 
                 />
               )}
            </Card>
          </View>
        </AnimatedSection>

        {/* Daily Routine Summary */}
        <AnimatedSection delay={180}>
           <View paddingH-24 marginT-24>
              <Text h3 marginB-12>Your Routine</Text>
              <View br10 backgroundColor={Colors.surface} padding-24>
                 <RoutineRow 
                   done={!!today.data?.food_entries.length} 
                   icon="restaurant" 
                   title="Meals Logged" 
                   value={today.data?.food_entries.length ? `${today.data.food_entries.length} items` : "Empty"}
                 />
                 <View backgroundColor={Colors.background} height={1} marginV-12 />
                 <RoutineRow 
                   done={stats.supplements >= activeSupplementCount && activeSupplementCount > 0} 
                   icon="medkit" 
                   title="Supplements" 
                   value={`${stats.supplements} / ${activeSupplementCount}`}
                 />
              </View>
           </View>
        </AnimatedSection>

      </ScrollView>
    </Screen>
  );
}

function ActionTile({ icon, label, color, onPress }: { icon: any, label: string, color: string, onPress: () => void }) {
  const fg = (Colors as any)[color] || Colors.primary;
  return (
    <TouchableOpacity 
      backgroundColor={Colors.white} 
      br10 
      center 
      flex 
      onPress={onPress} 
      padding-12 
      style={{ elevation: 2, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 10, shadowOffset: { width: 0, height: 4 } }}
    >
      <View backgroundColor={`${fg}20`} br100 padding-12>
        <Ionicons color={fg} name={icon} size={24} />
      </View>
      <Text bold color={fg} marginT-8 small>{label}</Text>
    </TouchableOpacity>
  );
}

function RoutineRow({ icon, title, value, done }: { icon: any, title: string, value: string, done: boolean }) {
  return (
    <View centerV row spread>
       <View centerV row>
          <View backgroundColor={done ? Colors.primary : Colors.background} br10 center height={36} width={36}>
             <Ionicons color={done ? 'white' : Colors.muted} name={icon} size={18} />
          </View>
          <View marginL-12>
             <Text bold body>{title}</Text>
             <Text small>{value}</Text>
          </View>
       </View>
       {done && <Ionicons color={Colors.primary} name="checkmark-circle" size={24} />}
    </View>
  );
}
