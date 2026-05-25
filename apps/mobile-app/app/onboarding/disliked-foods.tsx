import { Ionicons } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import { router } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { 
  View, 
  Text, 
  Card, 
  Button, 
  Colors, 
  TouchableOpacity,
  Badge as UIBadge
} from "react-native-ui-lib";
import { Screen } from "../../src/components/Screen";
import { AnimatedSection, PageHeader, ProgressSteps, FilterChip, SearchInput } from "../../src/components/ui";
import { searchFoods, type FoodSearchItem } from "../../src/features/foods/api";
import { getProfile, updateProfile } from "../../src/features/profile/api";
import { useAuthStore } from "../../src/stores/auth-store";
import { spacing, radii } from "../../src/theme/design";

const MAX_DISLIKED_FOODS = 12;

const fallbackFoods: FoodSearchItem[] = [
  { id: 1, name: "Broccoli", slug: "broccoli", category: "Vegetables", serving_size_g: "100", nutrients: [] },
  { id: 2, name: "Mushrooms", slug: "mushrooms", category: "Vegetables", serving_size_g: "100", nutrients: [] },
  { id: 3, name: "Spinach", slug: "spinach", category: "Vegetables", serving_size_g: "100", nutrients: [] },
  { id: 4, name: "Sardines", slug: "sardines", category: "Fish", serving_size_g: "100", nutrients: [] },
  { id: 5, name: "Tofu", slug: "tofu", category: "Protein", serving_size_g: "100", nutrients: [] },
  { id: 6, name: "Eggplant", slug: "eggplant", category: "Vegetables", serving_size_g: "100", nutrients: [] },
  { id: 7, name: "Lentils", slug: "lentils", category: "Legumes", serving_size_g: "100", nutrients: [] },
  { id: 8, name: "Greek yogurt", slug: "greek-yogurt", category: "Dairy", serving_size_g: "100", nutrients: [] },
];

function normalize(value: string) {
  return value.trim().toLowerCase();
}

export default function DislikedFoodsOnboardingScreen() {
  const [query, setQuery] = useState("");
  const [selectedFoods, setSelectedFoods] = useState<string[]>([]);
  const [status, setStatus] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let mounted = true;

    async function loadProfile() {
      try {
        const profile = await getProfile();
        if (mounted) {
          setSelectedFoods(profile.disliked_foods.slice(0, MAX_DISLIKED_FOODS));
        }
      } catch {
        // Empty defaults are fine for first-time onboarding.
      }
    }

    void loadProfile();

    return () => {
      mounted = false;
    };
  }, []);

  const trimmedQuery = query.trim();
  const foodSearch = useQuery({
    enabled: trimmedQuery.length >= 2,
    queryKey: ["foods", "search", trimmedQuery],
    queryFn: () => searchFoods(trimmedQuery),
  });

  const fallbackMatches = useMemo(() => {
    if (!trimmedQuery) {
      return fallbackFoods;
    }
    const needle = normalize(trimmedQuery);
    return fallbackFoods.filter((food) => normalize(food.name).includes(needle) || normalize(food.category ?? "").includes(needle));
  }, [trimmedQuery]);

  const foods = trimmedQuery.length >= 2 && foodSearch.data?.length ? foodSearch.data : fallbackMatches;

  const toggleFood = (name: string) => {
    setStatus(null);
    setSelectedFoods((current) => {
      if (current.includes(name)) {
        return current.filter((food) => food !== name);
      }
      if (current.length >= MAX_DISLIKED_FOODS) {
        setStatus(`Limit reached (${MAX_DISLIKED_FOODS}).`);
        return current;
      }
      return [...current, name];
    });
  };

  const onFinish = async () => {
    setSaving(true);
    setStatus(null);
    try {
      await updateProfile({ disliked_foods: selectedFoods });
      useAuthStore.getState().setProfileComplete(true);
      router.replace("/tabs/home");
    } catch {
      setStatus("Unable to save your choices.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Screen>
      <View padding-24 gap-24>
        <ProgressSteps current={4} total={4} />
        
        <AnimatedSection>
          <PageHeader eyebrow="Almost done" title="Avoidances" subtitle="We'll make sure your daily plans don't include things you dislike." />
        </AnimatedSection>

        <AnimatedSection delay={80}>
          <Card padding-24 gap-16>
            <View row spread centerV>
              <Text label small>My Dislikes</Text>
              <UIBadge label={`${selectedFoods.length}/${MAX_DISLIKED_FOODS}`} backgroundColor={selectedFoods.length >= MAX_DISLIKED_FOODS ? Colors.error : Colors.primary} />
            </View>
            
            <SearchInput onChangeText={setQuery} placeholder="Search foods to avoid" value={query} />
            
            <View row style={{ flexWrap: "wrap", gap: 6 }}>
              {selectedFoods.map(food => (
                <TouchableOpacity key={food} onPress={() => toggleFood(food)} backgroundColor={Colors.background} br100 paddingH-12 paddingV-6 row centerV>
                  <Text small bold color={Colors.primary}>{food}</Text>
                  <Ionicons name="close" size={14} color={Colors.primary} style={{ marginLeft: 4 }} />
                </TouchableOpacity>
              ))}
              {!selectedFoods.length && <Text body color={Colors.muted}>No foods selected yet.</Text>}
            </View>
          </Card>
        </AnimatedSection>

        <AnimatedSection delay={150}>
           <View gap-8>
              {foods.slice(0, 6).map((food) => {
                const selected = selectedFoods.includes(food.name);
                return (
                  <TouchableOpacity
                    key={food.id}
                    onPress={() => toggleFood(food.name)}
                    backgroundColor={selected ? Colors.primary : Colors.white}
                    br10
                    padding-16
                    row
                    spread
                    style={{ borderWidth: 1, borderColor: selected ? Colors.primary : Colors.background }}
                  >
                    <Text body bold color={selected ? 'white' : Colors.text}>{food.name}</Text>
                    <Ionicons name={selected ? "checkmark-circle" : "add-circle-outline"} size={20} color={selected ? 'white' : Colors.muted} />
                  </TouchableOpacity>
                );
              })}
           </View>
        </AnimatedSection>

        {status && <Text bold center color={Colors.error}>{status}</Text>}

        <View marginT-8 gap-12 paddingB-32>
          <Button 
            label={saving ? "Finalizing..." : "Get Started"} 
            disabled={saving} 
            onPress={onFinish} 
            size={Button.sizes.large}
          />
          <TouchableOpacity onPress={() => router.replace("/tabs/home")} center>
             <Text small bold color={Colors.muted}>SKIP FOR NOW</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Screen>
  );
}
