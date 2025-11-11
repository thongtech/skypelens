import { AppShell as MantineAppShell, Burger, Group, ActionIcon } from "@mantine/core";
import { useDisclosure, useMediaQuery } from '@mantine/hooks';
import { useEffect } from 'react';
import { IconChevronRight } from "@tabler/icons-react";
import { ColorSchemeToggle } from "../ColorSchemeToggle/ColorSchemeToggle";
import { Sidebar } from "./Sidebar";
import { MainContent } from "./MainContent";

export function AppShell() {
	const [opened, { toggle }] = useDisclosure();
	const [navbarCollapsed, { toggle: toggleNavbar, close: expandNavbar }] = useDisclosure(false);
	const isMobile = useMediaQuery('(max-width: 767px)');

	useEffect(() => {
		if (isMobile) {
			expandNavbar();
		}
	}, [isMobile, expandNavbar]);

	return (
		<MantineAppShell
			header={{ height: { base: 60, sm: 0 } }}
			navbar={{
				width: navbarCollapsed ? 60 : 300,
				breakpoint: 'sm',
				collapsed: { mobile: !opened },
			}}
			styles={{
				main: {
					height: "100dvh",
				},
				navbar: {
					height: "100dvh",
				},
			}}
		>
		<MantineAppShell.Header>
			<Group h="100%" px="md" justify="space-between">
				<Burger
					opened={opened}
					onClick={toggle}
					hiddenFrom="sm"
					size="sm"
				/>
				<ColorSchemeToggle />
			</Group>
		</MantineAppShell.Header>

			<MantineAppShell.Navbar>
				{navbarCollapsed ? (
					<Group justify="center" p="md" visibleFrom="sm">
						<ActionIcon variant="subtle" onClick={toggleNavbar}>
							<IconChevronRight size={16} />
						</ActionIcon>
					</Group>
				) : (
					<Sidebar navbarCollapsed={navbarCollapsed} toggleNavbar={toggleNavbar} />
				)}
			</MantineAppShell.Navbar>

			<MantineAppShell.Main>
				<MainContent />
			</MantineAppShell.Main>
		</MantineAppShell>
	);
}
