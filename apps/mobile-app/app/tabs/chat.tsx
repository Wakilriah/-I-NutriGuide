"use client";

import { Ionicons } from "@expo/vector-icons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { KeyboardAvoidingView, Platform, ScrollView, Text, View } from "react-native";
import { MobileAppShell } from "../../src/components/MobileAppShell";
import { AppCard, AppTopBar, Badge, ChatAssistant, ChatInputBar, ChatMessageBubble, ErrorState, QuickPromptChips, SkeletonCard, TypingIndicator } from "../../src/components/ui";
import { ChatMessage, ChatSession, clearChatSessions, listChatSessions, sendChatMessage } from "../../src/features/chat/api";
import { colors, radii, spacing, typography } from "../../src/theme/design";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const starterPrompts = [
  "What should I eat with iron?",
  "Can I take coffee with supplements?",
  "Explain my latest recommendation",
  "What should I avoid?",
];

const welcomeMessage: ChatMessage = {
  id: "welcome",
  role: "assistant",
  content: "Hi! I can help with food pairings, supplement timing, allergies, water, calories, and recommendation explanations.",
  metadata: {},
  recommendation_run_id: null,
  groq_model: "",
  token_usage: {},
  error_code: "",
  created_at: new Date(0).toISOString(),
};

export default function ChatScreen() {
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const scrollRef = useRef<ScrollView>(null);
  const sessionsQuery = useQuery({ queryKey: ["chat-sessions"], queryFn: listChatSessions });
  const [activeSessionId, setActiveSessionId] = useState<string | undefined>();
  const [draft, setDraft] = useState("");
  const [historyCleared, setHistoryCleared] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([welcomeMessage]);

  const sendMutation = useMutation({
    mutationFn: sendChatMessage,
    onSuccess: (response, variables) => {
      setHistoryCleared(false);
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

  const clearMutation = useMutation({
    mutationFn: clearChatSessions,
    onSuccess: async () => {
      setHistoryCleared(true);
      setActiveSessionId(undefined);
      setMessages([welcomeMessage]);
      queryClient.setQueryData<ChatSession[]>(["chat-sessions"], []);
      await queryClient.invalidateQueries({ queryKey: ["chat-sessions"] });
    },
  });

  useEffect(() => {
    if (historyCleared) {
      return;
    }
    const latestSession = sessionsQuery.data?.[0];
    if (!latestSession || sendMutation.isPending) {
      return;
    }
    setActiveSessionId(latestSession.id);
    if (latestSession.messages.length) {
      setMessages(latestSession.messages);
    }
  }, [historyCleared, sessionsQuery.data, sendMutation.isPending]);

  useEffect(() => {
    requestAnimationFrame(() => {
      scrollRef.current?.scrollToEnd({ animated: true });
    });
  }, [messages.length, sendMutation.isPending]);

  const sendMessage = (text = draft) => {
    const trimmed = text.trim();
    if (!trimmed || sendMutation.isPending) {
      return;
    }
    setHistoryCleared(false);
    setMessages((current) => [
      ...current,
      {
        id: `pending-${trimmed}`,
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
    <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1, backgroundColor: colors.background }}>
      <MobileAppShell>
        <AppTopBar title="I-NutriGuide Assistant" subtitle="Online" />
        <ScrollView
          contentContainerStyle={{ gap: spacing.lg, padding: spacing.lg, paddingBottom: 124 + insets.bottom }}
          keyboardShouldPersistTaps="handled"
          onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: true })}
          ref={scrollRef}
          showsVerticalScrollIndicator={false}
        >
          <ChatAssistant clearing={clearMutation.isPending} onClear={() => clearMutation.mutate()} />
          <QuickPromptChips onPick={sendMessage} prompts={starterPrompts} />

          {sessionsQuery.isLoading ? <SkeletonCard lines={2} /> : null}
          {sendMutation.isError || clearMutation.isError ? <ErrorState message="I could not process that request. Please try again." /> : null}

          <View style={{ gap: spacing.md }}>
            {messages.map((message) => {
              const isAssistant = message.role === "assistant";
              const citedItems = message.metadata?.cited_items ?? [];
              return (
                <View key={message.id} style={{ gap: spacing.sm }}>
                  <ChatMessageBubble role={isAssistant ? "assistant" : "user"}>{message.content}</ChatMessageBubble>

                  {isAssistant && citedItems.length > 0 ? (
                    <View style={{ gap: spacing.xs }}>
                      {citedItems.slice(0, 3).map((item) => (
                        <AppCard key={item.id} style={{ gap: spacing.xs, padding: spacing.md }}>
                          <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.sm }}>
                            <View style={styles.foodIcon}>
                              <Ionicons color={colors.primary} name="restaurant" size={16} />
                            </View>
                            <Text numberOfLines={1} style={{ flex: 1, color: colors.text, fontWeight: "900" }}>{item.food.name}</Text>
                            <Badge label={`${Math.round(Number(item.score) * 100)}%`} tone="green" />
                          </View>
                          <Text style={typography.body}>{item.explanation}</Text>
                        </AppCard>
                      ))}
                    </View>
                  ) : null}
                </View>
              );
            })}
            {sendMutation.isPending ? <TypingIndicator /> : null}
          </View>
        </ScrollView>

        <View style={[styles.inputDock, { bottom: spacing.lg + insets.bottom }]}>
          <ChatInputBar disabled={sendMutation.isPending} onChangeText={setDraft} onSend={() => sendMessage()} value={draft} />
        </View>
      </MobileAppShell>
    </KeyboardAvoidingView>
  );
}

const styles = {
  foodIcon: {
    width: 34,
    height: 34,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    borderRadius: radii.md,
    backgroundColor: colors.primarySoft,
  },
  inputDock: {
    position: "absolute" as const,
    left: spacing.lg,
    right: spacing.lg,
  },
};
