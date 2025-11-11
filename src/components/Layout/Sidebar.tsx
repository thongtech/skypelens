import { useState } from "react";
import { Stack, Text, Group, ActionIcon, TextInput, Paper, Anchor } from "@mantine/core";
import { IconChevronLeft, IconChevronRight, IconSearch, IconX, IconBrandGithub } from "@tabler/icons-react";
import { ColorSchemeToggle } from "../ColorSchemeToggle/ColorSchemeToggle";
import { ConversationList } from "../Conversation/ConversationList";
import { useConversations } from "../../store/messageStore";

interface SidebarProps {
	navbarCollapsed: boolean;
	toggleNavbar: () => void;
}

export function Sidebar({ navbarCollapsed, toggleNavbar }: SidebarProps) {
	const conversations = useConversations();
	const [searchQuery, setSearchQuery] = useState("");

	return (
		<Stack h="100%" gap={0}>
		<Paper
			px="md"
			py="lg"
			withBorder
			style={{ flexShrink: 0 }}
			bg="light-dark(var(--mantine-color-gray-0), var(--mantine-color-dark-7))"
		>
			<Group justify="space-between">
				<Text size="lg" fw={600}>
					Conversations
				</Text>
				<Group gap="xs">
					<Anchor
						href="https://github.com/thongtech/skypelens"
						target="_blank"
						rel="noopener noreferrer"
						style={{ display: "flex", alignItems: "center" }}
					>
						<ActionIcon variant="subtle" size="lg">
							<IconBrandGithub size={18} />
						</ActionIcon>
					</Anchor>
					<ColorSchemeToggle />
					<ActionIcon variant="subtle" onClick={toggleNavbar} visibleFrom="sm">
						{navbarCollapsed ? <IconChevronRight size={16} /> : <IconChevronLeft size={16} />}
					</ActionIcon>
				</Group>
			</Group>
		</Paper>
			{conversations.length > 0 && (
				<Stack px="md" pt="sm" pb="xs" gap={0} style={{ flexShrink: 0 }}>
					<TextInput
						placeholder="Search conversations..."
						value={searchQuery}
						onChange={(event) => setSearchQuery(event.currentTarget.value)}
						leftSection={<IconSearch size={16} />}
						rightSection={
							searchQuery && (
								<ActionIcon
									size="sm"
									variant="subtle"
									onClick={() => setSearchQuery("")}
								>
									<IconX size={14} />
								</ActionIcon>
							)
						}
					styles={{
						input: {
							backgroundColor: "light-dark(var(--mantine-color-gray-0), var(--mantine-color-dark-6))",
							border: "1px solid light-dark(var(--mantine-color-gray-3), var(--mantine-color-dark-4))",
							"&:focus": {
								borderColor: "#0078d4",
							},
						},
					}}
					/>
				</Stack>
			)}
			<Stack p="xs" style={{ flexGrow: 1, minHeight: 0, overflow: "auto" }}>
				{conversations.length > 0 ? (
					<ConversationList searchQuery={searchQuery} />
				) : (
					<Text c="dimmed" ta="center" mt="xl">No conversations loaded</Text>
				)}
			</Stack>
		</Stack>
	);
}
