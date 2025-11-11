import { MantineProvider } from "@mantine/core";
import { AppShell } from "./components/Layout/AppShell";

export default function App() {
  return (
    <MantineProvider defaultColorScheme="auto">
      <AppShell />
    </MantineProvider>
  );
}
