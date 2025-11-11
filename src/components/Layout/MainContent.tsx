import { Center, Stack } from "@mantine/core";
import { useCallback } from "react";
import { FileUpload } from "../Upload/FileUpload";
import { useMessageStore, useExportData } from "../../store/messageStore";
import type { SkypeExport } from "../../types/messages";
import { MessageView } from "../Message/MessageView";

export function MainContent() {
	const { setExportData } = useMessageStore();
	const exportData = useExportData();

	const handleFileProcessed = useCallback((data: SkypeExport) => {
		setExportData(data);
	}, [setExportData]);

	if (!exportData) {
		return (
			<Center h="100%">
				<FileUpload
					onFileProcessed={handleFileProcessed}
				/>
			</Center>
		);
	}

	return (
		<Stack h="100%" style={{ overflow: "auto" }}>
			<MessageView />
		</Stack>
	);
}
