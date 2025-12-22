import React, { useState, useRef, useEffect } from "react";
import {
  Box,
  TextField,
  Button,
  Paper,
  Stack,
  Typography,
  CircularProgress,
  Alert,
} from "@mui/material";
import { Message, Proposal } from "../api/api";

interface ChatPanelProps {
  messages: Message[];
  proposals: Proposal[];
  onSendMessage: (content: string) => Promise<void>;
  onApplyProposal: (proposalId: string) => Promise<void>;
  sending: boolean;
  revisionCount: number;
}

const ChatPanel: React.FC<ChatPanelProps> = ({
  messages,
  proposals,
  onSendMessage,
  onApplyProposal,
  sending,
  revisionCount,
}) => {
  const [input, setInput] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, proposals]);

  const handleSend = async () => {
    if (!input.trim() || sending) return;
    const content = input.trim();
    setInput("");
    await onSendMessage(content);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  if (revisionCount >= 3) {
    return (
      <Alert severity="warning">
        Maximum revision count (3) reached. You can only approve the draft now.
      </Alert>
    );
  }

  return (
    <Paper sx={{ height: "100%", display: "flex", flexDirection: "column" }}>
      <Box sx={{ p: 2, borderBottom: 1, borderColor: "divider" }}>
        <Typography variant="h6">Review Chat</Typography>
        <Typography variant="caption" color="text.secondary">
          Revision: {revisionCount} / 3
        </Typography>
      </Box>

      <Box sx={{ flex: 1, overflow: "auto", p: 2 }}>
        <Stack spacing={2}>
          {messages.map((message) => (
            <Box
              key={message.id}
              sx={{
                display: "flex",
                justifyContent: message.role === "specialist" ? "flex-end" : "flex-start",
              }}
            >
              <Paper
                sx={{
                  p: 1.5,
                  maxWidth: "70%",
                  bgcolor: message.role === "specialist" ? "primary.main" : "grey.100",
                  color: message.role === "specialist" ? "white" : "text.primary",
                }}
              >
                <Typography variant="body2">{message.content}</Typography>
              </Paper>
            </Box>
          ))}

          {proposals.map((proposal) => (
            <ProposalCard
              key={proposal.id}
              proposal={proposal}
              onApply={() => onApplyProposal(proposal.id)}
              canApply={!proposal.applied && proposal.basedOnRevisionCount === revisionCount}
            />
          ))}

          {sending && (
            <Box sx={{ display: "flex", justifyContent: "flex-start" }}>
              <Paper sx={{ p: 1.5, bgcolor: "grey.100" }}>
                <CircularProgress size={16} sx={{ mr: 1 }} />
                <Typography variant="body2" component="span">
                  Generating proposal...
                </Typography>
              </Paper>
            </Box>
          )}

          <div ref={messagesEndRef} />
        </Stack>
      </Box>

      <Box sx={{ p: 2, borderTop: 1, borderColor: "divider" }}>
        <Stack direction="row" spacing={1}>
          <TextField
            fullWidth
            size="small"
            placeholder="Type your feedback..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={handleKeyPress}
            disabled={sending || revisionCount >= 3}
            multiline
            maxRows={3}
          />
          <Button
            variant="contained"
            onClick={handleSend}
            disabled={!input.trim() || sending || revisionCount >= 3}
          >
            Send
          </Button>
        </Stack>
      </Box>
    </Paper>
  );
};

interface ProposalCardProps {
  proposal: Proposal;
  onApply: () => void;
  canApply: boolean;
}

const ProposalCard: React.FC<ProposalCardProps> = ({ proposal, onApply, canApply }) => {
  return (
    <Paper sx={{ p: 2, bgcolor: "info.light", border: 1, borderColor: "info.main" }}>
      <Typography variant="subtitle2" gutterBottom>
        Proposed Revision
      </Typography>
      <Typography variant="body2" sx={{ mb: 1 }}>
        <strong>Summary:</strong> {proposal.summary}
      </Typography>
      {proposal.safetyNotes && (
        <Alert severity="info" sx={{ mb: 1 }}>
          <strong>Safety Notes:</strong> {proposal.safetyNotes}
        </Alert>
      )}
      <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 1 }}>
        Based on revision: {proposal.basedOnRevisionCount}
      </Typography>
      {proposal.applied ? (
        <Alert severity="success" sx={{ mt: 1 }}>
          This proposal has been applied.
        </Alert>
      ) : (
        <Button
          variant="contained"
          size="small"
          onClick={onApply}
          disabled={!canApply}
          sx={{ mt: 1 }}
        >
          Apply Proposal
        </Button>
      )}
    </Paper>
  );
};

export default ChatPanel;

