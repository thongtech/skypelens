import { Stack, UnstyledButton, Text, Group, Badge } from "@mantine/core";
import { memo, useMemo } from "react";
import {
  useConversations,
  useSelectedConversationId,
  useExportData,
  useSelectConversation,
} from "../../store/messageStore";
import { formatRelativeTime } from "../../utils/dateFormat";
import { getMessagePreview } from "../../utils/messageProcessor";
import { cleanDisplayName } from "../../utils/displayName";
import type { Conversation } from "../../types/messages";

interface ConversationListProps {
	searchQuery: string;
}

const ConversationItem = memo(function ConversationItem({
	conversation,
	isSelected,
	userId,
	onSelect,
}: {
	conversation: Conversation;
	isSelected: boolean;
	userId: string;
	onSelect: (id: string) => void;
}) {
	const messages = conversation.MessageList;
	const messageCount = messages.length;
	const lastMessageIndex = messages.length - 1;
	const lastMessage = messages[lastMessageIndex];
	const secondLastMessage = messages[lastMessageIndex - 1];

	const preview = lastMessage ? getMessagePreview(lastMessage, userId, secondLastMessage) : "";
	const handleClick = () => onSelect(conversation.id);

	const displayName = cleanDisplayName(conversation.displayName) || cleanDisplayName(conversation.id) || conversation.id;

	return (
		<UnstyledButton
			onClick={handleClick}
			px="md"
			py="sm"
			bg={isSelected ? "light-dark(var(--mantine-color-blue-0), var(--mantine-color-dark-6))" : undefined}
			style={{
				borderRadius: "var(--mantine-radius-md)",
				transition: "background-color 150ms ease",
				borderLeft: isSelected ? "3px solid #0078d4" : "3px solid transparent",
			}}
			styles={{
				root: {
					"&:hover": {
						backgroundColor: isSelected
							? "light-dark(var(--mantine-color-blue-0), var(--mantine-color-dark-6))"
							: "light-dark(var(--mantine-color-gray-0), var(--mantine-color-dark-5))",
					},
				},
			}}
		>
			<Stack gap="xs">
				<Group justify="space-between" wrap="nowrap" gap="xs">
					<Group gap="xs" wrap="nowrap" style={{ flex: 1, minWidth: 0 }}>
						<Text 
							c={isSelected ? "light-dark(var(--mantine-color-gray-9), var(--mantine-color-gray-0))" : "light-dark(var(--mantine-color-gray-7), var(--mantine-color-gray-3))"} 
							fw={isSelected ? 600 : 500} 
							lineClamp={1}
							size="sm"
						>
							{displayName}
						</Text>
						<Badge
							size="sm"
							variant="light"
							color="gray"
							style={{ flexShrink: 0 }}
						>
							{messageCount}
						</Badge>
					</Group>
					{lastMessage && (
						<Text
							size="xs"
							c="dimmed"
							style={{ whiteSpace: "nowrap", flexShrink: 0 }}
							dangerouslySetInnerHTML={{
								__html: formatRelativeTime(lastMessage.originalarrivaltime),
							}}
						/>
					)}
				</Group>
				{preview && (
					<Text size="xs" c="dimmed" lineClamp={2}>
						{preview}
					</Text>
				)}
			</Stack>
		</UnstyledButton>
	);
});

export function ConversationList({ searchQuery }: ConversationListProps) {
	const conversations = useConversations();
	const selectConversation = useSelectConversation();
	const selectedConversationId = useSelectedConversationId();
	const exportData = useExportData();

	const filteredConversations = useMemo(() => {
		if (!searchQuery.trim()) return conversations;

		const query = searchQuery.toLowerCase().trim();
		return conversations.filter((c) => {
			const name = c.displayName || c.id;
			return name.toLowerCase().includes(query);
		});
	}, [conversations, searchQuery]);

	if (filteredConversations.length === 0) {
		return (
			<Text c="dimmed" ta="center" mt="xl">
				No conversations found
			</Text>
		);
	}

	return (
		<Stack gap="xs">
			{filteredConversations.map((conversation) => (
				<ConversationItem
					key={conversation.id}
					conversation={conversation}
					isSelected={conversation.id === selectedConversationId}
					userId={exportData?.userId || ""}
					onSelect={selectConversation}
				/>
			))}
		</Stack>
	);
}
