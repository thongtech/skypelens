import { ActionIcon, useMantineColorScheme, useComputedColorScheme } from "@mantine/core";
import { IconSun, IconMoon } from "@tabler/icons-react";

export function ColorSchemeToggle() {
	const { setColorScheme } = useMantineColorScheme();
	const computedColorScheme = useComputedColorScheme();

	return (
		<ActionIcon
			onClick={() => setColorScheme(computedColorScheme === "dark" ? "light" : "dark")}
			variant="subtle"
			size="lg"
			aria-label="Toggle color scheme"
		>
			{computedColorScheme === "dark" ? (
				<IconSun size={20} />
			) : (
				<IconMoon size={20} />
			)}
		</ActionIcon>
	);
}

