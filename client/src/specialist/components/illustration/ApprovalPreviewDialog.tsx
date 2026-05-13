import Dialog from "@mui/material/Dialog";
import DialogTitle from "@mui/material/DialogTitle";
import type { BookReaderModel } from "../../../components/book/BookReaderModel";
import BookReaderCore from "../../../components/book/BookReaderCore";

interface Props {
  open: boolean;
  onClose: () => void;
  model: BookReaderModel | null;
}

export default function ApprovalPreviewDialog({ open, onClose, model }: Props) {
  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="lg">
      <DialogTitle>Preview as published book</DialogTitle>
      {model ? <BookReaderCore model={model} onClose={onClose} /> : null}
    </Dialog>
  );
}
