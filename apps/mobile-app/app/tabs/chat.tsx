"use client";

import { Ionicons } from "@expo/vector-icons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { KeyboardAvoidingView, Platform, ScrollView } from "react-native";
import { 
  View, 
  Text, 
  Card, 
  Button, 
  Colors, 
  TouchableOpacity,
  TextField,
  Incubator,
} from "react-native-ui-lib";
import { Screen } from "../../src/components/Screen";
import { AnimatedSection, AppTopBar, Badge, ErrorState, FilterChip, PageHeader, SkeletonCard } from "../../src/components/ui";
import { ChatMessage, ChatSession, clearChatSessions, listChatSessions, sendChatMessage } from "../../src/features/chat/api";
import { spacing } from "../../src/theme/design";

const starterPrompts = [
  "Recommend foods for my supplements",
  "Explain my latest recommendation",
  "What should I avoid?",
  "Update my disliked foods",
];

const welcomeMessage: ChatMessage = {
  id: "welcome",
  role: "assistant",
  content: "Hi, I am your nutrition assistant. Ask about food pairings, supplement timing, allergies, or recommendation ideas.",
  metadata: {},
  recommendation_run_id: null,
  groq_model: "",
  token_usage: {},
  error_code: "",
  created_at: new Date(0).toISOString(),
};

export default function ChatScreen() {
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
    const pendingId = `pending-${trimmed}`;
    setHistoryCleared(false);
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
    <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1, backgroundColor: Colors.background }}>
      <View flex>
        <AppTopBar />
        <ScrollView
          contentContainerStyle={{ padding: 24, paddingBottom: 32 }}
          keyboardShouldPersistTaps="handled"
          onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: true })}
          ref={scrollRef}
          showsVerticalScrollIndicator={false}
        >
          <View gap-24>
            <AnimatedSection>
              <PageHeader eyebrow="AI Assistant" title="Chat" subtitle="Get intelligent pairing tips and health explanations." />
            </AnimatedSection>

            <AnimatedSection delay={40}>
              <Button
                outline
                disabled={clearMutation.isPending || sendMutation.isPending}
                label={clearMutation.isPending ? "Clearing..." : "Clear Chat History"}
                onPress={() => clearMutation.mutate()}
                size={Button.sizes.small}
                color={Colors.muted}
              />
            </AnimatedSection>

            <AnimatedSection delay={80}>
              <Card padding-16 gap-8 style={{ borderLeftWidth: 4, borderLeftColor: Colors.primary }}>
                <View row centerV spread>
                   <Badge label="AI Powered" tone="orange" />
                </View>
                <Text h3>Personalized insights from your food engine</Text>
                <Text body>The assistant analyzes your profile, supplements, and goals before generating results.</Text>
              </Card>
            </AnimatedSection>

            <AnimatedSection delay={130} gap-8>
              <Text label small>Quick Questions</Text>
              <View row style={{ flexWrap: "wrap", gap: 8 }}>
                {starterPrompts.map((prompt) => (
                  <FilterChip key={prompt} label={prompt} onPress={() => sendMessage(prompt)} />
                ))}
              </View>
            </AnimatedSection>

            <AnimatedSection delay={180} gap-16>
              {sessionsQuery.isLoading && <SkeletonCard lines={2} />}
              {(sendMutation.isError || clearMutation.isError) && <ErrorState message="I could not process that request. Please try again." />}
              
              {messages.map((message) => {
                const isAssistant = message.role === "assistant";
                const citedItems = message.metadata?.cited_items ?? [];
                return (
                  <View key={message.id} gap-8>
                    <View style={{ alignItems: isAssistant ? "flex-start" : "flex-end" }}>
                      <View
                        backgroundColor={isAssistant ? Colors.white : Colors.primary}
                        padding-16
                        br10
                        style={{
                          maxWidth: "88%",
                          borderBottomLeftRadius: isAssistant ? 4 : 20,
                          borderBottomRightRadius: isAssistant ? 20 : 4,
                          borderWidth: 1,
                          borderColor: isAssistant ? Colors.background : Colors.primary,
                        }}
                      >
                        <Text bold={isAssistant} color={isAssistant ? Colors.text : Colors.white} body>
                          {message.content}
                        </Text>
                      </View>
                    </View>
                    
                    {isAssistant && citedItems.length > 0 && (
                      <View gap-8>
                        {citedItems.slice(0, 3).map((item) => (
                          <Card key={item.id} padding-12 gap-8 style={{ backgroundColor: Colors.white }}>
                            <View row centerV spread>
                              <View row centerV flex>
                                <View backgroundColor={Colors.background} br10 center height={32} width={32} marginR-12>
                                   <Ionicons name="restaurant" size={16} color={Colors.primary} />
                                </View>
                                <Text body bold flex numberOfLines={1}>{item.food.name}</Text>
                              </View>
                              <Badge label={`${Math.round(Number(item.score) * 100)}%`} tone="green" />
                            </View>
                            <Text small color={Colors.muted}>{item.explanation}</Text>
                          </Card>
                        ))}
                      </View>
                    )}
                  </View>
                );
              })}
              {sendMutation.isPending && <SkeletonCard lines={2} />}
            </AnimatedSection>
          </View>
        </ScrollView>

        {/* Input Bar */}
        <View 
          padding-16 
          backgroundColor={Colors.white} 
          style={{ borderTopWidth: 1, borderTopColor: Colors.background }}
        >
          <View row centerV gap-12>
            <View flex backgroundColor={Colors.background} br10 paddingH-16 paddingV-4>
              <TextField
                multiline
                placeholder="Ask your nutritionist..."
                onChangeText={setDraft}
                value={draft}
                hideUnderline
                style={{ minHeight: 40, maxHeight: 120, color: Colors.text, fontWeight: '600' }}
              />
            </View>
            <TouchableOpacity 
              onPress={() => sendMessage()} 
              disabled={sendMutation.isPending}
              backgroundColor={Colors.primary}
              br100
              center
              style={{ width: 48, height: 48 }}
            >
              <Ionicons name="send" size={20} color="white" />
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}
