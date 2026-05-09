import FontAwesome from '@expo/vector-icons/FontAwesome';
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import 'react-native-reanimated';

import { useColorScheme } from '@/components/useColorScheme';

export {
  // Catch any errors thrown by the Layout component.
  ErrorBoundary,
} from 'expo-router';

export const unstable_settings = {
  initialRouteName: "index",
};

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [loaded, error] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
    ...FontAwesome.font,
  });

  // Expo Router uses Error Boundaries to catch errors in the navigation tree.
  useEffect(() => {
    if (error) throw error;
  }, [error]);

  useEffect(() => {
    if (loaded) {
      SplashScreen.hideAsync();
    }
  }, [loaded]);

  if (!loaded) {
    return null;
  }

  return <RootLayoutNav />;
}

function RootLayoutNav() {
  const colorScheme = useColorScheme();

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <Stack>
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen name="projects/index" options={{ title: "Projects" }} />
        <Stack.Screen name="projects/[projectId]/openings" options={{ title: "Openings" }} />
        <Stack.Screen name="projects/[projectId]/edit" options={{ title: "Edit project" }} />
        <Stack.Screen name="openings/[openingId]/index" options={{ title: "Opening" }} />
        <Stack.Screen name="openings/[openingId]/edit" options={{ title: "Edit opening" }} />
        <Stack.Screen name="openings/[openingId]/capture" options={{ title: "Capture" }} />
        <Stack.Screen name="openings/[openingId]/compare" options={{ title: "Compare scans" }} />
        <Stack.Screen name="openings/[openingId]/tolerance" options={{ title: "Tolerance overrides" }} />
        <Stack.Screen name="sessions/[sessionId]/review" options={{ title: "Review" }} />
        <Stack.Screen name="sync/index" options={{ title: "Sync queue" }} />
        <Stack.Screen name="settings/operator" options={{ title: "Operator" }} />
      </Stack>
    </ThemeProvider>
  );
}
