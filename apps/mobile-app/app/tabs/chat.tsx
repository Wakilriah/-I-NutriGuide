import { Ionicons } from "@expo/vector-icons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { Text, TextInput, TouchableOpacity, View } from "react-native";
import { Screen } from "../../src/components/Screen";
import { AnimatedSection, AppCard, Badge, ErrorState, FilterChip, PageHeader, SkeletonCard } from "../../src/components/ui";
import { ChatMessage, ChatSession, listChatSessions, sendChatMessage } from "../../src/features/chat/api";
import { colors, iconSizes, radii, spacing, typography } from "../../src/theme/design";

const starterPrompts = [
  "Recommend foods for my supplements",
  "Explain my latest recommendation",
  "What should I avoid?",
  "Update my disliked foods",
];

export default function ChatScreen() {
  const queryClient = useQueryClient();
  const sessionsQuery = useQuery({ queryKey: ["chat-sessions"], queryFn: listChatSessions });
  const [activeSessionId, setActiveSessionId] = useState<string | undefined>();
  const [draft, setDraft] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "welcome",
      role: "assistant",
      content: "Hi, I am your nutrition assistant. Ask about food pairings, supplement timing, allergies, or recommendation ideas.",
      metadata: {},
      recommendation_run_id: null,
      groq_model: "",
      token_usage: {},
      error_code: "",
      created_at: new Date(0).toISOString(),
    },
  ]);

  const sendMutation = useMutation({
    mutationFn: sendChatMessage,
    onSuccess: (response, variables) => {
      setActiveSessionId(response.session_id);
      setMessages((current) => [
        ...current.filter((message) => message.id !== variables.session_id && message.id !== `pending-${variables.message}`),
        response.user_message,
        response.assistant_message,
      ]);
      queryClient.setQueryData<ChatSession[]>(["chat-sessions"], (current) => {
        if (!current) {
          return current;
        }
        const nextSession = {
          id: response.session_id,
          title: variables.message,
          created_at: response.user_message.created_at,
          updated_at: response.assistant_message.created_at,
          messages: [response.user_message, response.assistant_message],
        };
        const remaining = current.filter((session) => session.id !== response.session_id);
        return [nextSession, ...remaining];
      });
    },
  });

  useEffect(() => {
    const latestSession = sessionsQuery.data?.[0];
    if (!latestSession || sendMutation.isPending) {
      return;
    }
    setActiveSessionId(latestSession.id);
    if (latestSession.messages.length) {
      setMessages(latestSession.messages);
    }
  }, [sessionsQuery.data, sendMutation.isPending]);

  const sendMessage = (text = draft) => {
    const trimmed = text.trim();
    if (!trimmed || sendMutation.isPending) {
      return;
    }
    const pendingId = `pending-${trimmed}`;
    setMessages((current) => [
      ...current,
      {
        id: pendingId,
        role: "user",
        content: trimmed,
        metadata: {},
        recommendation_run_id: null,
        groq_model: "",
        token_usage: {},
        error_code: "",
        created_at: new Date().toISOString(),
      },
    ]);
    sendMutation.mutate({ session_id: activeSessionId, message: trimmed });
    setDraft("");
  };

  return (
    <Screen>
      <View style={{ gap: spacing.lg }}>
        <AnimatedSection>
          <PageHeader eyebrow="AI Assistant" title="Nutrition chat" subtitle="Ask for supplement-aware food ideas, timing tips, and recommendation explanations." />
        </AnimatedSection>

        <AnimatedSection delay={80}>
          <AppCard style={{ gap: spacing.sm, backgroundColor: colors.primary }}>
            <Badge label="Association rules + Groq" tone="orange" />
            <Text style={{ color: colors.surface, fontSize: 20, fontWeight: "900" }}>Personalized answers from your food engine</Text>
            <Text style={{ color: colors.surfaceOnDark, lineHeight: 22 }}>The chat uses your saved profile, supplements, and recommendation rules before asking Groq to explain the result.</Text>
          </AppCard>
        </AnimatedSection>

        <AnimatedSection delay={130} style={{ gap: spacing.xs }}>
          <Text style={typography.label}>Try asking</Text>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.xs }}>
            {starterPrompts.map((prompt) => (
              <FilterChip key={prompt} label={prompt} onPress={() => sendMessage(prompt)} />
            ))}
          </View>
        </AnimatedSection>

        <AnimatedSection delay={180} style={{ gap: spacing.sm }}>
          {sessionsQuery.isLoading ? <SkeletonCard lines={2} /> : null}
          {sendMutation.isError ? <ErrorState message="I could not send that message. Please try again." /> : null}
          {messages.map((message) => {
            const assistant = message.role === "assistant";
            const citedItems = message.metadata?.cited_items ?? [];
            return (
              <View key={message.id} style={{ gap: spacing.xs }}>
                <View style={{ alignItems: assistant ? "flex-start" : "flex-end" }}>
                  <View
                    style={{
                      maxWidth: "88%",
                      borderRadius: radii.lg,
                      borderBottomLeftRadius: assistant ? 4 : radii.lg,
                      borderBottomRightRadius: assistant ? radii.lg : 4,
                      backgroundColor: assistant ? colors.surface : colors.primary,
                      borderColor: assistant ? colors.border : colors.primary,
                      borderWidth: 1,
                      padding: spacing.md,
                    }}
                  >
                    <Text style={{ color: assistant ? colors.text : colors.surface, lineHeight: 22, fontWeight: "700" }}>{message.content}</Text>
                  </View>
                </View>
                {assistant && citedItems.length ? (
                  <View style={{ gap: spacing.xs }}>
                    {citedItems.slice(0, 3).map((item) => (
                      <AppCard key={item.id} style={{ gap: spacing.xs, padding: spacing.sm }}>
                        <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.sm }}>
                          <View style={{ width: 38, height: 38, alignItems: "center", justifyContent: "center", borderRadius: radii.md, backgroundColor: colors.primarySoft }}>
                            <Ionicons color={colors.primary} name="restaurant" size={iconSizes.sm} />
                          </View>
                          <View style={{ flex: 1 }}>
                            <Text style={{ color: colors.text, fontWeight: "900" }}>{item.food.name}</Text>
                            <Text style={{ color: colors.muted, marginTop: 2 }}>{item.food.category}</Text>
                          </View>
                          <Badge label={`${Math.round(Number(item.score) * 100)}%`} tone="green" />
                        </View>
                        <Text style={{ color: colors.muted, lineHeight: 20 }}>{item.explanation}</Text>
                      </AppCard>
                    ))}
                  </View>
                ) : null}
              </View>
            );
          })}
          {sendMutation.isPending ? (
            <View testID="chat-loading-skeleton">
              <SkeletonCard lines={2} />
            </View>
          ) : null}
        </AnimatedSection>

        <AnimatedSection delay={220}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.sm }}>
            <TextInput
              accessibilityLabel="Chat message"
              multiline
              onChangeText={setDraft}
              placeholder="Ask for a recommendation..."
              placeholderTextColor={colors.placeholder}
              style={{
                minHeight: 52,
                maxHeight: 110,
                flex: 1,
                borderColor: colors.border,
                borderRadius: radii.lg,
                borderWidth: 1,
                backgroundColor: colors.surface,
                color: colors.text,
                paddingHorizontal: spacing.md,
                paddingVertical: spacing.sm,
              }}
              value={draft}
            />
            <TouchableOpacity
              accessibilityLabel="Send chat message"
              disabled={sendMutation.isPending}
              onPress={() => sendMessage()}
              style={{
                width: 52,
                height: 52,
                alignItems: "center",
                justifyContent: "center",
                borderRadius: radii.lg,
                backgroundColor: colors.primary,
                opacity: sendMutation.isPending ? 0.7 : 1,
              }}
            >
              <Ionicons color={colors.surface} name="send" size={iconSizes.md} />
            </TouchableOpacity>
          </View>
        </AnimatedSection>
      </View>
    </Screen>
  );
}
