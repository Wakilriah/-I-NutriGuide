jest.mock("expo-secure-store", () => ({
  deleteItemAsync: jest.fn(async () => undefined),
  getItemAsync: jest.fn(async () => null),
  setItemAsync: jest.fn(async () => undefined),
}));

jest.mock("react-native-reanimated", () => {
  const React = require("react");
  const { View } = require("react-native");
  const animation = {
    delay: () => animation,
    duration: () => animation,
    springify: () => animation,
  };
  return {
    __esModule: true,
    default: {
      View: ({ children, entering, ...props }: { children: unknown; entering?: unknown }) => React.createElement(View, props, children),
    },
    FadeIn: animation,
    FadeInDown: animation,
  };
});

jest.mock("@expo/vector-icons", () => {
  const React = require("react");
  const { Text } = require("react-native");
  return {
    Ionicons: ({ name }: { name?: string }) => React.createElement(Text, { accessibilityLabel: name }, name ?? "icon"),
  };
});

jest.mock("expo-router", () => ({
  Link: ({ children }: { children: unknown }) => {
    const React = require("react");
    const { Text } = require("react-native");
    return React.createElement(Text, null, children);
  },
  Stack: () => null,
  Tabs: Object.assign(() => null, { Screen: () => null }),
  useLocalSearchParams: jest.fn(() => ({})),
  router: {
    push: jest.fn(),
    replace: jest.fn(),
  },
}));
